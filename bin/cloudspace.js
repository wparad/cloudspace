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

//Set default region to test with
aws.config.update({
	region: 'us-east-1',
	apiVersions: {
		ec2: '2015-10-01'
	}
});

var ec2 = new aws.EC2();

var ec2RegionProvider = () => {
	return ec2.describeRegions({}).promise()
	.then((data) => {
		return Promise.all(data.Regions.map((r) => new aws.EC2({region: r.RegionName })));
	});
};

commander
	.command('create')
	.description('Create the AWS Cloudspace')
	.action(() => {
		console.log('Creating your Cloudspace in AWS.');
		ec2.runInstances({
			ImageId: 'ami-f652979b',
			InstanceType: 't2.micro',
			MinCount: 1, MaxCount: 1,
			KeyName: 'Cloudspace-SSH',
			ClientToken: uuid.v4(),
			NetworkInterfaces: [
				{
					SubnetId: 'subnet-4ae0b512',
					DeviceIndex: 0,
					AssociatePublicIpAddress: true
				}
			]
			/*
			BlockDeviceMappings: [
				{
					DeviceName: '/dev/sda1',
					Ebs: {
						DeleteOnTermination: true,
						Encrypted: false,
						VolumeSize: 8,
						VolumeType: 'standard'
					}
				}
			],
			*/
		}).promise()
		.then((result) => {
			var resultInfo = {
				Id: result.Instances[0].InstanceId,
				IpAddress: result.Instances[0].PublicIpAddress,
				PrivateIp: result.Instances[0].PrivateIpAddress
			}
			console.log(`Created Instance: ${JSON.stringify(resultInfo, null, 2)}`);
			return ec2.createTags({
				Resources: [resultInfo.Id],
				Tags: [{ Key: 'Name', Value: 'Cloudspace' }]
			}).promise()
			.catch((failure) => Promise.reject({
				Error: 'Failed to udpated tags',
				Detail: failure
			}));
		})
		.catch((failure) => {
			console.error(failure);
		})
		
	});

commander
	.command('list')
	.description('List the AWS Cloudspace')
	.action(() => {
		console.log('List your Cloudspace in AWS.');
		ec2RegionProvider().then((regionProviders) => {
			return regionProviders.reduce((instancePromise, ec2Provider) => {
				console.log(`Looking up instances in ${ec2Provider.config.region}`);
				return ec2Provider.describeInstances({
					Filters: [{Name: 'tag:Name', Values: ['Cloudspace']}, {Name: 'instance-state-name', Values: ['pending', 'running', 'stopping', 'stopped']}]
				}).promise()
				.then((data) => {
					var localInstances = [];
					data.Reservations.map((reservations) => {
						reservations.Instances.map((instance) => localInstances.push({
							Id: instance.InstanceId,
							IpAddress: instance.PublicIpAddress,
							PrivateIp: instance.PrivateIpAddress
						}));
					});
					return instancePromise.then((instances) => instances.concat(localInstances));
				});
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
		ec2RegionProvider().then((regionProviders) => {
			return regionProviders.reduce((instancePromise, ec2Provider) => {
				console.log(`Looking up instances in ${ec2Provider.config.region}`);
				return ec2Provider.describeInstances({
					Filters: [{Name: 'tag:Name', Values: ['Cloudspace']}, {Name: 'instance-state-name', Values: ['pending', 'running', 'stopping', 'stopped']}]
				}).promise()
				.then((data) => {
					var localInstances = _.flatten(data.Reservations.map((reservations) => reservations.Instances.map((instance) => instance.InstanceId)));
					return instancePromise.then((currentInstances) => {
						if(localInstances.length == 0) { return currentInstances; }
						return ec2.terminateInstances({InstanceIds: localInstances}).promise()
						.then(() => localInstances.concat(currentInstances));
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