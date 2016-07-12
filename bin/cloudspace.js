#!/usr/bin/node
'use strict';

const aws = require('aws-sdk');
const commander = require('commander');
const fs = require('fs');
const path = require('path');
const uuid = require('node-uuid');
const _ = require('lodash');

var packageMetadataFile = path.join(__dirname, '..', 'package.json');
var package_metadata = require(packageMetadataFile);
commander.version(package_metadata.version);

var userDataFile = path.join(__dirname, 'userdata.sh');
//Set default region
var REGION = 'us-east-1';
aws.config.update({
	region: REGION,
	apiVersions: {
		ec2: '2015-10-01'
	}
});

function GetCurrentUserPromise() {
	return new aws.IAM().getUser({}).promise().then((data) => data.User.UserName);
}

function GetEc2FactoriesPromise() {
	return new aws.EC2().describeRegions({}).promise()
	.then((data) => {
		return Promise.all(data.Regions.map((r) => new aws.EC2({region: r.RegionName })));
	});
};

commander
	.command('create')
	.description('Create the AWS Cloudspace')
	.action(() => {
		console.log('Creating your Cloudspace in AWS.');
		var userNamePromise = GetCurrentUserPromise();

		var ec2FactoryPromise = GetEc2FactoriesPromise().then((ec2Factories) => {
			var localFactory = ec2Factories.find((ec2Factory) => ec2Factory.config.region == REGION);
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

			var securityGroupPromise = ec2Factory.describeSecurityGroups({Filters: [{Name: 'group-name', Values: ['Cloudspace']}]}).promise()
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
			fs.readFile(userDataFile, (error, data) => {
				if(error) { return f({Error: 'Failed to load userdata', Detail: error}); }
				return s(data);
			});
		});

		var ec2CreatePromise = Promise.all([ec2FactoryPromise, vpcMetadataPromise, userDataPromise])
		.then((ec2FactoryAndMetadata) => {
			var ec2Factory = ec2FactoryAndMetadata[0];
			var subnet = ec2FactoryAndMetadata[1].Subnet;
			var securityGroup = ec2FactoryAndMetadata[1].SecurityGroup;
			var userData = ec2FactoryAndMetadata[2];

			return ec2Factory.runInstances({
				ImageId: 'ami-f652979b',
				InstanceType: 't2.micro',
				MinCount: 1, MaxCount: 1,
				KeyName: 'Cloudspace-SSH',
				ClientToken: uuid.v4(),
				SubnetId: subnet,
				SecurityGroupIds: [ securityGroup ],
				UserData: new Buffer(userData).toString('base64')
			}).promise()
			.then((result) => {
				var instance = result.Instances[0];
				var resultInfo = {
					Id: instance.InstanceId,
					PrivateIp: instance.PrivateIpAddress,
					InstanceType: instance.InstanceType,
					Region: ec2Factory.config.region
				};
				console.log(`Created Instance: ${JSON.stringify(resultInfo, null, 2)}`);
				return resultInfo;
			});
		});

		Promise.all([ec2CreatePromise, ec2FactoryPromise, userNamePromise])
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
		})
		.catch((failure) => {
			console.error(failure);
		});
	});

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

commander
	.command('list')
	.description('List the AWS Cloudspace')
	.action(() => {
		console.log('Cloudspace List in AWS.');
		var userNamePromise = GetCurrentUserPromise();
		var ec2FactoriesPromise = GetEc2FactoriesPromise();

		return Promise.all([userNamePromise, ec2FactoriesPromise])
		.then(result => {
			var userName = result[0];
			var ec2Factories = result[1];
			return ec2Factories.reduce((instancePromise, ec2Factory) => {
				return Promise.all([instancePromise, GetCloudSpaceInstancesPromise(userName, ec2Factory)]).then(result => result[0].concat(result[1]));
			}, Promise.resolve([]));
		})
		.then((instances) => {
			console.log(JSON.stringify(instances, null, 2));
		})
		.catch((failure) => { console.log(failure); });
	});

commander
	.command('terminate')
	.description('Terminate the AWS Cloudspaces')
	.action(() => {
		var userNamePromise = GetCurrentUserPromise();
		var ec2FactoriesPromise = GetEc2FactoriesPromise();
		Promise.all([userNamePromise, ec2FactoriesPromise])
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
		})
		.then((instances) => {
			console.log(`Instances successfully terminated: ${JSON.stringify(instances, null, 2)}`);
		})
		.catch((failure) => { console.log(failure); });
	});

commander.on('*', () => {
	if(commander.args.join(' ') == 'tests/**/*.js') { return; }
	console.log('Unknown Command: ' + commander.args.join(' '));
	commander.help();
	process.exit(0);
});
commander.parse(process.argv[2] ? process.argv : process.argv.concat(['list']));