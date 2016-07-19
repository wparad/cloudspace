#!/usr/bin/env bash

##################
## User Updates ##
##################
useradd {{user}} -m -s "/bin/bash" -G cdrom,adm,dialout,plugdev,netdev,lxd,sudo,video,users,games,audio,dip,admin
cp /home/ubuntu/.ssh /home/{{user}}/.ssh -r
chown {{user}}:{{user}} /home/{{user}}/.ssh -R
echo '%sudo ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers

################
## Node Setup ##
################
curl -sL https://deb.nodesource.com/setup_4.x | bash -
apt-get install -y nodejs build-essential

########################
## Package Management ##
########################
add-apt-repository -y ppa:webupd8team/sublime-text-3
add-apt-repository -y ppa:webupd8team/java
apt-get update
apt-get install -y git xorg unzip # sublime-text-installer

######################
## Android Packages ##
######################
# echo oracle-java8-installer shared/accepted-oracle-license-v1-1 select true | /usr/bin/debconf-set-selections
# apt-get install -y oracle-java8-installer lib32z1 lib32ncurses5 lib32stdc++6 g++ libswt-gtk-3-java #openjdk-8-jdk
# echo "JAVA_HOME=$(update-alternatives --query javac | sed -n -e 's/Best: *\(.*\)\/bin\/javac/\1/p')" >> /etc/environment
# curl https://dl.google.com/android/android-sdk_r24.4.1-linux.tgz -O
# mkdir /android
# tar -xzvf android-sdk_r24.4.1-linux.tgz -C /android
# echo "ANDROID_HOME=/android/android-sdk-linux" >> /etc/environment
# mkdir {{user}}/.local -m 666
# sudo $ANDROID_HOME/tools/android update sdk --filter tools,platform-tools,android-23,build-tools-23.0.3,extra-android-m2repository,extra-google-m2repository,extra-android-support --all --no-ui
# sudo npm install -g nativescript