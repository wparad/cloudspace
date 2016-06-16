# Linux CloudSpace
Free yourself from your Desktop, and reserve some cloud space just for yourself. Don't be grounded by your hardware.

[![npm version](https://badge.fury.io/js/cloudspace.svg)](https://badge.fury.io/js/cloudspace) [![Build Status](https://travis-ci.org/wparad/cloudspace.svg?branch=master)](https://travis-ci.org/wparad/cloudspace)

## Prerequisites

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
					"ec2:DescribeRegions"
				],
				"Resource": "*"
			}
		]
	}
	```
* Import a keypair named `Cloudspace-SSH`
	* If necessary one can be created by using `ssh-keygen -b 4096 -t rsa`
	* And then importing using the [AWS console UI](https://console.aws.amazon.com/ec2/v2/home#KeyPairs:sort=keyName).
* Create an EC2 service Role (and [Service Profile](http://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2_instance-profiles.html)) called `Cloudspace`
	* with the necessary permissions, to your AWS account (if necessary).
* Create VPC Subnet (and VPC if necessary)
	* Name the VPC Subnet `Cloudspace`
	* Set `Enable auto-assign Public IP` to true
	* Use ACL Restrictions for VPC to manage security:
		* Inbound Rules

			| Rule #           |        Type   |   Protocol    |   Port Range  | Source    | Allow / Deny |
			| :--------------: |--------------:|--------------:|--------------:|----------:|-------------:|
			| 100              | ALL Traffic   |   ALL         |   ALL         | Private IP| ALLOW        |

		* Outbound Rules

			| Rule #           |        Type   |   Protocol    |   Port Range  | Source    | Allow / Deny |
			| :--------------: |--------------:|--------------:|--------------:|----------:|-------------:|
			| 100              | ALL Traffic   |   ALL         |   ALL         | 0.0.0.0/0 | ALLOW        |

		* Security Group
			* Inbound Rules

				|        Type  |   Protocol    |   Port Range  | Source    |
				|-------------:|--------------:|--------------:|----------:|
				| SSH (22)     |   TCP(6)      |   22          | 0.0.0.0/0 |

			* Outbound Rules

				|        Type   |   Protocol    |   Port Range  | Source    |
				|--------------:|--------------:|--------------:|----------:|
				| ALL Traffic   |   ALL         |   ALL         | 0.0.0.0/0 |

* Create a Security Group named `Cloudspace` and specify next to the Cloudspace Subnet in configuration.
* Create Internet Gateway named `Cloudspace` and attach to the VPC
* Update the Route Table for the VPC to target `0.0.0.0/0` at the new Internet Gateway.
* Create a Virtual Private Gateway named `Cloudspace` and attach it to the `Cloudspace` VPC.

## Usage

* `npm install -g cloudspace`
* `cloudspace`
	* `list`: Displays all EC2 instances
	* `create`: Create an Cloudspace instance
	* `terminate`: delete all instances