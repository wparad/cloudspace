#!/bin/bash
#add-apt-repository -y ppa:webupd8team/sublime-text-3
apt-get update
apt-get install -y git xorg
useradd {{user}} -m -s "/bin/bash" -G cdrom,adm,dialout,plugdev,netdev,lxd,sudo,video,users,games,audio,dip,admin
cp /home/ubuntu/.ssh /home/{{user}}/.ssh -r
chown {{user}}:{{user}} /home/{{user}}/.ssh -R
echo '%sudo ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers