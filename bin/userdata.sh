#!/bin/bash

##################
## User Updates ##
##################
useradd {{user}} -m -s "/bin/bash" -G cdrom,adm,dialout,plugdev,netdev,lxd,sudo,video,users,games,audio,dip,admin
cp /home/ubuntu/.ssh /home/{{user}}/.ssh -r
chown {{user}}:{{user}} /home/{{user}}/.ssh -R
echo '%sudo ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers

#add-apt-repository -y ppa:webupd8team/sublime-text-3
########################
## Package Management ##
########################
apt-get update
apt-get install -y git xorg unzip

##########################
## Android Development ##
##########################
#Off until android studio works remotely, currently it is very slow.
#apt-get install -y openjdk-8-jdk lib32z1 lib32ncurses5 libstdc++6:i386 g++
#echo "JAVA_HOME=$(update-alternatives --query javac | sed -n -e 's/Best: *\(.*\)\/bin\/javac/\1/p')" >> /etc/environment