#!/usr/bin/node
'use strict';

const aws = require('aws-sdk');
const commander = require('commander');
const fs = require('fs');
const path = require('path');
const uuid = require('node-uuid');

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
			SubnetId: 'subnet-4ae0b512'
		}).promise()
		.then((result) => {
			console.log(`Created Instance Id: ${result.Instances[0].InstanceId}`);
			return ec2.createTags({
				Resources: [result.Instances[0].InstanceId],
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
		ec2.describeRegions({}).promise()
		.then((data) => {
			return ec2RegionProvider().then((regionProviders) => {
				return regionProviders.reduce((instancePromise, ec2Provider) => {
					console.log(`Looking up instances in ${ec2Provider.config.region}`);
					return ec2Provider.describeInstances({
						Filters: [{Name: 'tag:Name', Values: ['Cloudspace']}]
					}).promise()
					.then((data) => {
						var localInstances = [];
						data.Reservations.map((reservations) => {
							reservations.Instances.map((instance) => localInstances.push({
								Id: instance.InstanceId,
								Info: instance
							}));
						});
						return instancePromise.then((instances) => instances.concat(localInstances));
					});
				}, Promise.resolve([]));
			});
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
		var ec2 = new aws.EC2({apiVersion: '2015-10-01'});
		ec2.describeInstances({
			Filters: [{Name: 'tag:Role', Values: ['Cloudspace']}]
		}, function(err, data) {
			console.log("Destroying the following AWS EC2 instances: " + instances);
			ec2.terminateInstances({InstanceIds: instances}, function(error, data) {
				if (err) { console.log(err, err.stack); }
				else { console.log(data); }
			});
		});
	});

commander.on('*', () => {
	if(commander.args.join(' ') == 'tests/**/*.js') { return; }
	console.log('Unknown Command: ' + commander.args.join(' '));
	commander.help();
	process.exit(0);
});
commander.parse(process.argv[2] ? process.argv : process.argv.concat(['list']));