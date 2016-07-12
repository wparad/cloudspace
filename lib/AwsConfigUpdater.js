'use strict';
var aws = require('aws-sdk');
var path = require('path');
var fs = require('fs');

function AwsConfigUpdater(defaultRegion) {
	this.Region = defaultRegion;
}

AwsConfigUpdater.prototype.Update = function() {
	//Set default region
	try {
		var data = fs.readFileSync(path.join(process.env.HOME, '.aws/credentials')).toString('UTF-8');
		var match = data.match(/region[ =]+([a-z0-9-]+)/);
		if(match && match[1]) { this.Region = match[1]; }
	}
	catch (exception) {
		console.log('File ~/.aws/credentials has not been created.');
		process.exit(1);
	}

	aws.config.update({
		region: this.Region,
		apiVersions: {
			ec2: '2015-10-01'
		}
	});
}

module.exports = AwsConfigUpdater;