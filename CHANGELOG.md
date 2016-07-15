# Change log
This is the changelog for AWS-Architect templated [service](readme.md).

## 1.2 ##
* Store the SSH credentials in an S3 buckets and dynamically load them to the client machine @ ~/.cloudspace/id_rsa
* Update the .ssh/config file with the cloudspace alias

## 1.1 ##
* Expose the library for explicit execution instead of using the commandline.
* Add SSH command to just show IpAddress

## 1.0 ##
* New AWS-Architect templated tool.
* Find subnets and security groups automatically.
* Allow cloudspaces to be active on a per (AWS) user basis.
* Restrict cloudspaces to 1 per user.