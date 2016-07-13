# Linux CloudSpace
Free yourself from your Desktop, and reserve some cloud space just for yourself. Don't be grounded by your hardware.

[![npm version](https://badge.fury.io/js/cloudspace.svg)](https://badge.fury.io/js/cloudspace) [![Build Status](https://travis-ci.org/wparad/cloudspace.svg?branch=master)](https://travis-ci.org/wparad/cloudspace)

## Cloudspace Commands

### `cloudspace create`
Creates a new instance in the current region.

### `cloudspace list`
Lists all cloudspace instances in all regions.

### `cloudspace terminate`
Terminates all cloudspace instances in all regions.

### `cloudspace on`
Turns on an existing cloudspace instance, if none exists it will create one.

### `cloudspace off`
Turns off the existing cloudspace instance.

## Prerequisites

* Create the Credentials:
	* file `~/.aws/credentials`:
		```bash
		[default]
		aws_access_key_id = AWS_ACCESS_KEY_ID
		region = REGION
		aws_secret_access_key = AWS_SECRET_ACCESS_KEY
		```
	* Or specify in the environment variables, commandline, or call cloudspace library from your own wrapper.

* User must have the following access
	```
	{
		"Version": "2012-10-17",
		"Statement": [
			{
				"Effect": "Allow",
				"Action": [
					"ec2:RunInstances",
					"ec2:CreateTags",
					"ec2:DescribeInstances",
					"ec2:StartInstances",
					"ec2:StopInstances",
					"ec2:TerminateInstances",
					"ec2:DescribeRegions",
					"ec2:DescribeSubnets",
					"ec2:DescribeSecurityGroups"
				],
				"Resource": "*"
			}
		]
	}
	```
* Import a keypair named `Cloudspace-SSH`
	* If necessary one can be created by using `ssh-keygen -b 4096 -t rsa -C "user@email.com"`
	* And then importing using the [AWS console UI](https://console.aws.amazon.com/ec2/v2/home#KeyPairs:sort=keyName).
* Create an EC2 service Role (and [Service Profile](http://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2_instance-profiles.html)) called `Cloudspace`
	* with the necessary permissions, to your AWS account (if necessary).
* Create VPC (if necessary)
	* Set Tag:Name as `Cloudspace`
	* Set `Edit DNS Hostnames` to Yes
* Create VPC Subnet
	* Name the VPC Subnet `Cloudspace`
	* Set `Enable auto-assign Public IP` to true
	* Use ACL Restrictions for VPC to manage security:
		* Inbound Rules

			| Rule #           |        Type     |   Protocol    |   Port Range  | Source     | Allow / Deny |
			| :--------------: |----------------:|--------------:|--------------:|-----------:|-------------:|
			| 100              | ALL Traffic     |   ALL         |   ALL         | Private IP | ALLOW        |
			| 110              | Custom TCP Rule |   TCP (6)     | 1024-65535    | 0.0.0.0/0  | ALLOW        |

		* Outbound Rules

			| Rule #           |        Type   |   Protocol    |   Port Range  | Source    | Allow / Deny |
			| :--------------: |--------------:|--------------:|--------------:|----------:|-------------:|
			| 100              | ALL Traffic   |   ALL         |   ALL         | 0.0.0.0/0 | ALLOW        |

	* Update the Security Group automatically created (called `default`) for the VPC
		* Create the tag `Name`:`Cloudspace` for the VPC, using this tag `Cloudspace cli` will automatically use it.
		* Inbound Rules

			|        Type  |   Protocol    |   Port Range  | Source     |
			|-------------:|--------------:|--------------:|-----------:|
			| ALL Traffic  |   ALL         |   ALL         | Private IP |

		* Outbound Rules

			|        Type  |   Protocol    |   Port Range  | Source    |
			|-------------:|--------------:|--------------:|----------:|
			| ALL Traffic  |   ALL         |   ALL         | 0.0.0.0/0 |
* Create Internet Gateway named `Cloudspace` and attach to the VPC
	* Update the Route Table for the Subnet for the destination `0.0.0.0/0` to target the new Internet Gateway.

## Usage

* `npm install -g cloudspace`
* `cloudspace`
	* `list`: Displays all EC2 instances
	* `create`: Create an Cloudspace instance
	* `terminate`: delete all instances