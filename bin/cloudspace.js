#!/usr/bin/env node
'use strict';

const commander = require('commander');
const fs = require('fs');
const path = require('path');

var packageMetadataFile = path.join(__dirname, '..', 'package.json');
var package_metadata = require(packageMetadataFile);
commander.version(package_metadata.version);

const Cloudspace = require('../index');

//Available Ubuntu 16.04 Linux Images
const AMI = {
	'us-east-1': 'ami-ddf13fb0',
	'us-west-1': 'ami-b20542d2'
};
const cloudspace = new Cloudspace(path.join(__dirname, 'userdata.sh'), AMI);

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
	.command('on')
	.description('Turn on cloudspace instance.')
	.action(() => {
		console.log('Turning on Cloudspace.');
		cloudspace.On()
		.then(result => {
			console.log(`Turned On: ${JSON.stringify(result, null, 2)}`);
		})
		.catch((failure) => {
			console.error(failure);
		});
	});

commander
	.command('off')
	.description('Turn off cloudspace instance.')
	.action(() => {
		console.log('Turning off Cloudspace.');
		cloudspace.Off()
		.then(result => {
			console.log(`Turned Off: ${JSON.stringify(result, null, 2)}`);
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
		.catch((failure) => { console.log(JSON.stringify(failure, null, 2)); });
	});

commander
	.command('ssh')
	.description('Get the IpAddress for the first instance.')
	.action(() => {
		cloudspace.List()
		.then((instances) => {
			var instance = instances.find(i => i.State == 'running');
			if(instance != null) {
				console.log(`ssh cloudspace`);
				var sshConfig = path.join(process.env.HOME, '.ssh', 'config');
				var sshConfigInformation = `Host cloudspace
	HostName ${instance.IpAddress}
	IdentityFile ~/.cloudspace/id_rsa`
				return new Promise((s, f) => {
					fs.access(sshConfig, (error) => error ? f() : s());
				})
				.then(() => {
					return new Promise((s, f) => {
						fs.readFile(sshConfig, 'UTF-8', (error, data) => {
							if(error) { return f({Error: 'Failed to read ssh config file', Detail: error}); }
							var result = data.replace(/Host.cloudspace\s.*\s.*cloudspace\/id_rsa/, sshConfigInformation);
							fs.writeFile(sshConfig, result, 'utf8', (error) => {
								if (error) { f({Error: 'Failed to write ssh config file', Detail: error}); }
								return s();
							});
						});
					});
				}, () => {
					return new Promise((s, f) => {
						fs.writeFile(sshConfig, sshConfigInformation, (error) => {
							return error ? f({Error: 'Error writing Cloudspace SSH Key to file', Detail: error}) : s(null);
						});
					})
				});
			}
			else {
				console.error(JSON.stringify({'Info': 'No running instances to get IpAddress', Instances: instances }, null, 2));
				return null;
			}
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

commander.parse(process.argv[2] ? process.argv : process.argv.concat(['ssh']));