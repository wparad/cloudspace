#!/usr/bin/node
'use strict';

const aws = require('aws-sdk');
const uuid = require('node-uuid');
const mustache = require('mustache');

const AwsConfigUpdater = require('./lib/AwsConfigUpdater');

function GetCurrentUserPromise() {
	return new aws.IAM().getUser({}).promise().then((data) => data.User.UserName);
}

function GetEc2FactoriesPromise(region) {
	return new aws.EC2().describeRegions({}).promise()
	.then((data) => {
		return Promise.all(data.Regions.map((r) => new aws.EC2({region: r.RegionName })));
	})
	.then(ec2Factories => {
		return region == null ? Promise.resolve(ec2Factories) : ec2Factories.find((ec2Factory) => ec2Factory.config.region == region);
	})
};

function Cloudspace(defaultRegion, userDataTemplateFile, ami) {
	this.AwsConfigUpdater = new AwsConfigUpdater(defaultRegion);
	this.UserDataTemplateFile = userDataTemplateFile;
	this.Ami = ami;
}

Cloudspace.prototype.Create = function() {
	this.AwsConfigUpdater.Update();
	var userNamePromise = GetCurrentUserPromise();

	var ec2FactoryPromise = GetEc2FactoriesPromise(this.AwsConfigUpdater.Region)
	.then((localFactory) => {
		return userNamePromise.then(userName => {
			return GetCloudSpaceInstancesPromise(userName, localFactory).
			then(instances => {
				return instances.length > 0 ? Promise.reject({Error: 'Instance already created in region', instance: instances[0]}) : localFactory;
			});
		});
	});

	var vpcMetadataPromise = ec2FactoryPromise.then((ec2Factory) => {
		var subnetPromise = ec2Factory.describeSubnets({Filters: [{Name: 'tag:Name', Values: ['Cloudspace']}]}).promise()
		.then((data) => {
			if(data.Subnets.length == 0) { return Promise.reject({Error: `No subnets found in region ${ec2Factory.config.region} with Name 'Cloudspace`}); }
			return data.Subnets[0].SubnetId;
		})
		.catch((failure) => Promise.reject({'Error': 'Failed to lookup subnets for Cloudspace', Detail: failure}));

		var securityGroupPromise = ec2Factory.describeSecurityGroups({Filters: [{Name: 'tag-value', Values: ['Cloudspace']}]}).promise()
		.then((data) => {
			if(data.SecurityGroups.length == 0) { return Promise.reject({Error: `No security group found in region ${ec2Factory.config.region} with Name 'Cloudspace`}); }
			return data.SecurityGroups[0].GroupId;
		})
		.catch((failure) => Promise.reject({'Error': 'Failed to lookup security groups for Cloudspace', Detail: failure}));

		return Promise.all([subnetPromise, securityGroupPromise])
		.then((subnetAndSecurityGroup) => {
			return { Subnet: subnetAndSecurityGroup[0], SecurityGroup: subnetAndSecurityGroup[1] };
		});
	});

	var userDataPromise = new Promise((s, f) => {
		fs.readFile(this.UserDataTemplateFile, (error, data) => {
			if(error) { return f({Error: 'Failed to load userdata template', Detail: error}); }
			return s(data.toString('UTF-8'));
		});
	})
	.then(templateData => {
		try {
			var env = process.env;
			var username = env.SUDO_USER || env.C9_USER || env.LOGNAME || env.USER || env.LNAME || env.USERNAME;
			return mustache.render(templateData, { user: username });
		}
		catch (exception) {
			return Promise.reject({Error: 'Failed to template userdata', Detail: exception.stack || exception});
		}
	});

	var ec2CreatePromise = Promise.all([ec2FactoryPromise, vpcMetadataPromise, userDataPromise])
	.then((ec2FactoryAndMetadata) => {
		var ec2Factory = ec2FactoryAndMetadata[0];
		var subnet = ec2FactoryAndMetadata[1].Subnet;
		var securityGroup = ec2FactoryAndMetadata[1].SecurityGroup;
		var userData = ec2FactoryAndMetadata[2];

		return ec2Factory.runInstances({
			ImageId: this.Ami[this.AwsConfigUpdater.Region],
			InstanceType: 't2.small',
			MinCount: 1, MaxCount: 1,
			KeyName: 'Cloudspace-SSH',
			ClientToken: uuid.v4(),
			SubnetId: subnet,
			SecurityGroupIds: [ securityGroup ],
			UserData: new Buffer(userData).toString('base64')
		}).promise()
		.then((result) => {
			var instance = result.Instances[0];
			return {
				Id: instance.InstanceId,
				PrivateIp: instance.PrivateIpAddress,
				InstanceType: instance.InstanceType,
				Region: ec2Factory.config.region
			};
		});
	});

	var creationPromise = Promise.all([ec2CreatePromise, ec2FactoryPromise, userNamePromise])
	.then((ec2InfoAndFactory) => {
		var ec2Info = ec2InfoAndFactory[0];
		var ec2Factory = ec2InfoAndFactory[1];
		var userName = ec2InfoAndFactory[2];

		return ec2Factory.createTags({
			Resources: [ec2Info.Id],
			Tags: [{ Key: 'Name', Value: 'Cloudspace' }, { Key: 'User', Value: userName }]
		}).promise()
		.catch((failure) => {
			return ec2Factory.terminateInstances({InstanceIds: [ec2Info.Id]}).promise()
			.then(() => Promise.reject({
				Error: 'Failed to udpated tags',
				Detail: failure
			}));
		});
	});

	return Promise.all([userNamePromise, ec2FactoryPromise, creationPromise])
	.then(result => {
		var userName = result[0];
		var ec2Factory = result[1];
		return GetCloudSpaceInstancesPromise(userName, ec2Factory);
	});
};

Cloudspace.prototype.On = function() {
	this.AwsConfigUpdater.Update();
	var userNamePromise = GetCurrentUserPromise();
	var ec2FactoryPromise = GetEc2FactoriesPromise(this.AwsConfigUpdater.Region);

	return Promise.all([userNamePromise, ec2FactoryPromise])
	.then(result => {
		var userName = result[0];
		var ec2Factory = result[1];
		return GetCloudSpaceInstancesPromise(userName, ec2Factory)
		.then(instances => {
			return instances.length != 1 ? this.Create() : ec2Factory.startInstances({ InstanceIds: instances.map(i => i.Id) }).promise()
			.then(success => instances);
		});
	});
};

Cloudspace.prototype.Off = function() {
	this.AwsConfigUpdater.Update();
	var userNamePromise = GetCurrentUserPromise();
	var ec2FactoryPromise = GetEc2FactoriesPromise(this.AwsConfigUpdater.Region);

	return Promise.all([userNamePromise, ec2FactoryPromise])
	.then(result => {
		var userName = result[0];
		var ec2Factory = result[1];
		return GetCloudSpaceInstancesPromise(userName, ec2Factory)
		.then(instances => {
			return instances.length == 0 ? {Info: 'There are no instances created in this region to stop.'} : ec2Factory.stopInstances({ InstanceIds: instances.map(i => i.Id) }).promise()
			.then(success => instances);
		});
	});
};

function GetCloudSpaceInstancesPromise(userName, ec2Factory) {
	return ec2Factory.describeInstances({
		Filters: [{Name: 'tag:Name', Values: ['Cloudspace']}, { Name: 'tag:User', Values: [userName]}, {Name: 'instance-state-name', Values: ['pending', 'running', 'stopping', 'stopped']}]
	}).promise()
	.then((data) => {
		var localInstances = [];
		data.Reservations.map((reservations) => {
			reservations.Instances.map((instance) => localInstances.push({
				Id: instance.InstanceId,
				User: userName,
				Dns: instance.PublicDnsName,
				State: instance.State.Name,
				IpAddress: instance.PublicIpAddress,
				PrivateIp: instance.PrivateIpAddress,
				InstanceType: instance.InstanceType,
				Region: ec2Factory.config.region
			}));
		});
		return localInstances;
	});
};

Cloudspace.prototype.List = function() {
	this.AwsConfigUpdater.Update();
	var userNamePromise = GetCurrentUserPromise();
	var ec2FactoriesPromise = GetEc2FactoriesPromise();

	return Promise.all([userNamePromise, ec2FactoriesPromise])
	.then(result => {
		var userName = result[0];
		var ec2Factories = result[1];
		return ec2Factories.reduce((instancePromise, ec2Factory) => {
			return Promise.all([instancePromise, GetCloudSpaceInstancesPromise(userName, ec2Factory)]).then(result => result[0].concat(result[1]));
		}, Promise.resolve([]));
	});
};

Cloudspace.prototype.Terminate = function() {
	this.AwsConfigUpdater.Update();
	var userNamePromise = GetCurrentUserPromise();
	var ec2FactoriesPromise = GetEc2FactoriesPromise();
	return Promise.all([userNamePromise, ec2FactoriesPromise])
	.then(result => {
		var userName = result[0];
		var ec2Factories = result[1];
		return ec2Factories.reduce((instancePromise, ec2Factory) => {
			return GetCloudSpaceInstancesPromise(userName, ec2Factory)
			.then((instances) => {
				var instanceIds = instances.map((instance) => instance.Id);
				if(instanceIds.length == 0) { return instancePromise; }
				return instancePromise.then((currentInstances) => {
					return ec2Factory.terminateInstances({InstanceIds: instanceIds}).promise()
					.then(() => instances.concat(currentInstances));
				});
			});
		}, Promise.resolve([]));
	});
};

module.exports = Cloudspace;