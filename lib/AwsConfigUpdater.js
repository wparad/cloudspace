'use strict';
var aws = require('aws-sdk');
var path = require('path');
var fs = require('fs');
var _ = require('lodash');

function AwsConfigUpdater(iamFactory, sshKeyManager, defaultRegion) {
	this.IamFactory = iamFactory;
	this.SshKeyManager = sshKeyManager;
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
		region: this.Region
	});
	this.Cache = true;
};

AwsConfigUpdater.prototype.GetCurrentUserPromise = function() {
	this.Update();
	var userPromise = this.Validate().then(() => new aws.IAM().getUser({}).promise().then((data) => data.User));
	return userPromise
	.then(user => this.SshKeyManager.EnsureSshKeyPairPromise(new aws.EC2({region: this.Region }), user.UserName, user.Arn))
	.then(() => userPromise.then(user => user.UserName));
}

AwsConfigUpdater.prototype.Validate = function() {
	var userPromise = new aws.IAM().getUser({}).promise().then(data => data.User);
	return userPromise.then(user => {
		return Promise.all([
			this.IamFactory.simulatePrincipalPolicy({
				PolicySourceArn: user.Arn,
				ActionNames: [
					"iam:GetUser",
					"iam:SimulatePrincipalPolicy"
				],
				ResourceArns: [`arn:aws:iam::*:user/${user.UserName}`],
				ContextEntries: [
					{
						ContextKeyName: 'aws:username',
						ContextKeyValues: [user.UserName],
						ContextKeyType: 'string'
					}
				]
			}).promise(),
			this.IamFactory.simulatePrincipalPolicy({
				PolicySourceArn: user.Arn,
				ActionNames: [
					"ec2:RunInstances",
					"ec2:CreateTags",
					"ec2:DescribeInstances",
					"ec2:StartInstances",
					"ec2:StopInstances",
					"ec2:TerminateInstances",
					"ec2:DescribeRegions",
					"ec2:DescribeSubnets",
					"ec2:DescribeSecurityGroups",
					"ec2:DescribeKeyPairs",
					"ec2:CreateKeyPair",
					"ec2:DeleteKeyPair"
				]
			}).promise(),
			this.IamFactory.simulatePrincipalPolicy({
				PolicySourceArn: user.Arn,
				ActionNames: [
					"s3:GetObject",
					"s3:PutObject"
				],
				ResourceArns: [`arn:aws:s3:::Cloudspace-${user.Arn.split(':')[4]}/${user.UserName}*`],
				ContextEntries: [
					{
						ContextKeyName: 'aws:username',
						ContextKeyValues: [user.UserName],
						ContextKeyType: 'string'
					}
				]
			}).promise(),
			this.IamFactory.simulatePrincipalPolicy({
				PolicySourceArn: user.Arn,
				ActionNames: [
					"s3:CreateBucket",
					"s3:ListBucket"
				],
				ResourceArns: [`arn:aws:s3:::Cloudspace-${user.Arn.split(':')[4]}`],
				ContextEntries: [
					{
						ContextKeyName: 'aws:username',
						ContextKeyValues: [user.UserName],
						ContextKeyType: 'string'
					}
				]
			}).promise()
		]);
	})
	.then(results => {
		var failures = _.flatten(results.map(r => r.EvaluationResults)).filter(r => r.EvalDecision != 'allowed').map(r => r.EvalActionName);
		return failures.length > 0 ? Promise.reject({Error: 'User does not have permissions to necessary aws resource actions', Actions: failures}) : null;
	});
};

module.exports = AwsConfigUpdater;