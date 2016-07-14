# CloudSpace
Free yourself from your Desktop, and reserve some cloud space just for yourself. Don't be grounded by your hardware.

[![npm version](https://badge.fury.io/js/cloudspace.svg)](https://badge.fury.io/js/cloudspace) [![Build Status](https://travis-ci.org/wparad/cloudspace.svg?branch=master)](https://travis-ci.org/wparad/cloudspace)

## Usage
* `npm install -g cloudspace`

### Cloudspace Commands

* `cloudspace --help` : Lists the available commands
* `cloudspace create` : Creates a new instance in the current region.
* `cloudspace list` : Lists all cloudspace instances in all regions.
* `cloudspace ssh` : Get the first IpAddress of running instances, for piping to ssh command.  This is the default command.
* `cloudspace terminate` : Terminates all cloudspace instances in all regions.
* `cloudspace on` : Turns on an existing cloudspace instance, if none exists it will create one.
* `cloudspace off` : Turns off the existing cloudspace instance.

## Prerequisites

* AWS SDK Crendetials must be configured.
* Must have a user that contains the necessary [permissions](./lib/AwsConfigUpdater.js#L43)
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

### Use Cloudspace as a library
Cloudspace cli is a wrapper for the cloudspace library, which can be invoked directly.

```javascript
const pathToAwsUserData = path.join(__dirname, 'userdata.sh');
const ami = {
	'us-east-1': 'ami-ddf13fb0',
	'us-west-1': 'ami-b20542d2'
};

const cloudspace = new Cloudspace(pathToAwsUserData, ami);
cloudspace.Create();
```