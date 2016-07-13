'use strict';

/**
 * Module dependencies
 */
var fs = require('fs');
var exec = require('child_process').execSync;
var execAsync = require('child_process').spawn;
var path = require('path');

var travis = require('travis-build-tools')(process.env.GIT_TAG_PUSHER);
var version = travis.GetVersion();
var commander = require('commander');
commander.version(version);

var packageMetadataFile = path.join(__dirname, 'package.json');
commander
	.command('build')
	.description('Setup require build files for npm package.')
	.action(() => {
		var package_metadata = require(packageMetadataFile);
		package_metadata.version = version;
		fs.writeFileSync(packageMetadataFile, JSON.stringify(package_metadata, null, 2));

		console.log("Building package %s (%s)", package_metadata.name, version);
		console.log('');
	});

commander
	.command('after_build')
	.description('Publishes git tags and reports failures.')
	.action(() => {
		var package_metadata = require('./package.json');
		console.log("After build package %s (%s)", package_metadata.name, version);
		console.log('');
		travis.PublishGitTag();
		travis.MergeDownstream('release/', 'master');
	});

commander.on('*', () => {
	if(commander.args.join(' ') == 'tests/**/*.js') { return; }
	console.log('Unknown Command: ' + commander.args.join(' '));
	commander.help();
	process.exit(0);
});
commander.parse(process.argv[2] ? process.argv : process.argv.concat(['build']));