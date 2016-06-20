#!/bin/bash
apt-get update
apt-get install git
useradd warren -m -s "/bin/bash" -G cdrom,adm,dialout,plugdev,netdev,lxd,sudo,video,users,games,audio,dip,admin
echo '%sudo ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers