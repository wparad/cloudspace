#!/usr/bin/node
'use strict';

const commander = require('commander');
const path = require('path');

var packageMetadataFile = path.join(__dirname, '..', 'package.json');
var package_metadata = require(packageMetadataFile);
commander.version(package_metadata.version);

const Cloudspace = require('../lib/cloudspace');
const AwsConfigUpdater = require('../lib/AwsConfigUpdater');
var REGION = 'us-east-1';
const awsConfigUpdater = new AwsConfigUpdater(REGION);
const cloudspace = new Cloudspace(awsConfigUpdater, path.join(__dirname, 'userdata.sh'));

commander
	.command('create')
	.description('Create the AWS Cloudspace')
	.action(() => {
		console.log('Creating your Cloudspace in AWS.');
		cloudspace.Create()
		.then(result => {
			console.log(`Created Instance: ${JSON.stringify(result, null, 2)}`);
		})
		.catch((failure) => {
			console.error(failure);
		});
	});

commander
	.command('list')
	.description('List the AWS Cloudspace')
	.action(() => {
		console.log('Cloudspace List in AWS.');
		cloudspace.List()
		.then((instances) => {
			console.log(JSON.stringify(instances, null, 2));
		})
		.catch((failure) => { console.log(failure); });
	});

commander
	.command('terminate')
	.description('Terminate the AWS Cloudspaces')
	.action(() => {
		cloudspace.Terminate()
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