'use strict';
var path = require('path');
var fs = require('fs-extra');

function SshKeyManager(s3Factory) {
	this.S3Factory = s3Factory;
}

SshKeyManager.prototype.GetSshKeyPairName = function(userName) {
	return `Cloudspace-${userName}`;
}
SshKeyManager.prototype.EnsureSshKeyPairPromise = function(ec2Factory, userName, userArn) {
	var s3Bucket = `Cloudspace-${userArn.split(':')[4]}-${userName}`;
	var keyName = `Cloudspace-${userName}`;

	var getKeyPromise = ec2Factory.describeKeyPairs({KeyNames: [keyName]}).promise()
	//If it does exist then download it from S3
	.then(() => {
		return this.S3Factory.getObject({
			Bucket: s3Bucket,
			Key: 'id_rsa',
		}).promise()
		.then(data => data.Body)
		.catch(failure => Promise.reject({Error: 'Failed to get SSH Key from S3.', Detail: failure}));
	},
	//Does not exist, then create it, and upload to S3
	() => {
		var keyPromise = ec2Factory.createKeyPair({KeyName: keyName}).promise().then(data => data.KeyMaterial);
		return keyPromise.then(key => {
			return this.S3Factory.headBucket({Bucket: s3Bucket}).promise()
			.catch(error => this.S3Factory.createBucket({ Bucket: s3Bucket, ACL: 'private' }).promise())
			.then(() => this.S3Factory.waitFor('bucketExists', {Bucket: s3Bucket}).promise())
			.then(() => {
				var policy = JSON.stringify({
					"Version": "2012-10-17",
					"Statement": [
						{
							"Sid": s3Bucket,
							"Effect": "Deny",
							"Principal": {
								"AWS": `arn:aws:iam::${userArn.split(':')[4]}:root`
							},
							"Action": "s3:*",
							"Resource": `arn:aws:s3:::${s3Bucket}`,
							"Condition": {
								"StringNotEquals": {
									"aws:username": userName
								}
							}
						}
					]
				});
				return this.S3Factory.putBucketPolicy({Bucket: s3Bucket, Policy: policy}).promise()
				.then(() => this.S3Factory.putObject({
						ACL: 'private',
						Bucket: s3Bucket,
						Key: 'id_rsa',
						Body: key,
						ServerSideEncryption: 'AES256'
					}).promise()
					.catch(failure => Promise.reject({Error: 'Failed to upload SSH Key to S3.', Bucket: s3Bucket, Detail: failure}))
				);
			});
		}).then(() => keyPromise)
		.catch(failure => {
			var p = Promise.reject({Error: 'Failed to create SSH key for cloudspace.', Detail: failure});
			return ec2Factory.deleteKeyPair({KeyName: keyName}).promise().then(() => p, () => p);
		});
	})
	
	//Then no matter what write the key to the file system, for use by SSH
	return getKeyPromise
	.then(key => {
		return new Promise((s, f) => {
			fs.outputFile(path.join(process.env.HOME, '.cloudspace', 'id_rsa'), key, {mode: '0400'}, error => {
				return error ? f({Error: 'Error writing Cloudspace SSH Key to file', Detail: error}) : s(key);
			});
		});
	})
	.catch(failure => Promise.reject({Error: 'Failed to ensure SSH key pair exists.', Detail: failure}));
}

module.exports = SshKeyManager;