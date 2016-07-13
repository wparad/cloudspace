'use strict';
var aws = require('aws-sdk');
var path = require('path');
var fs = require('fs');

function AwsConfigUpdater(defaultRegion) {
	this.Region = defaultRegion;
	this.Cache = false;
}

AwsConfigUpdater.prototype.Update = function() {
	if(this.Cache) { return; }
	//Set default region
	try {
		var data = fs.readFileSync(path.join(process.env.HOME, '.aws/credentials')).toString('UTF-8');
		var match = data.match(/region[ =]+([a-z0-9-]+)/);
		if(match && match[1]) { this.Region = match[1]; }
	}
	catch (exception) {
	}

	aws.config.update({
		region: this.Region,
		apiVersions: {
			ec2: '2015-10-01'
		}
	});
	this.Cache = true;
}

module.exports = AwsConfigUpdater;