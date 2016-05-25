# AWS Desktop
Creates an AWS Desktop in the Cloud.

## Use ACL Restrictions for VPC to manage security:

* Inbound Rules
	| Rule #            |        Type   |   Protocol    |   Port Range  | Source    | Allow / Deny |
	| :---------------: |--------------:|--------------:|--------------:|----------:|-------------:|
	| 100               | HTTPS (443)   |   TCP (6)     |   443         | 0.0.0.0/0 | ALLOW        |
	| 110               | ALL Traffic   |   ALL         |   ALL         | Private IP| ALLOW        |

* Outbound Rules
	| Rule #            |        Type   |   Protocol    |   Port Range  | Source    | Allow / Deny |
	| :---------------: |--------------:|--------------:|--------------:|----------:|-------------:|
	| 110               | ALL Traffic   |   ALL         |   ALL         | 0.0.0.0/0 | ALLOW        |

* Security Group
	* Inbound Rules
		|        Type   |   Protocol    |   Port Range  | Source    |
		|--------------:|--------------:|--------------:|----------:|
		| SSH (22)      |   TCP(6)      |   22          | 0.0.0.0/0 |
	* Outbound Rules
		|        Type   |   Protocol    |   Port Range  | Source    |
		|--------------:|--------------:|--------------:|----------:|
		| ALL Traffic   |   ALL         |   ALL         | 0.0.0.0/0 |