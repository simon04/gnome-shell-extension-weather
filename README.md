![Screenshot](https://github.com/neroth/gnome-shell-extension-weather/raw/master/data/Screenshot.jpg)

*gnome-shell-extension-weather* is a simple extension for displaying weather conditions and forecasts in GNOME Shell.

Compared with the original version, this fork features: multiple locations, no WOEID required, a symmetrical layout and a settings panel in JavaScript (Seed).

Currently, the weather report, including forecasts for today and tomorrow, is fetched from [Yahoo! Weather](http://weather.yahoo.com/).

----

# Installation

After the installation, restart GNOME Shell (`Alt`+`F2`, `r`, `Enter`) and enable the extension through *gnome-tweak-tool*.

## Through a package manager

### [Ubuntu, Mint, Debian and derivatives](https://launchpad.net/~gnome-shell-extensions/+archive/ppa/+packages)

Add the PPA *ppa:gnome-shell-extensions* to your source list, update the package list and install *gnome-shell-extension-weather*:

	sudo add-apt-repository ppa:gnome-shell-extensions
	sudo apt-get update
	sudo apt-get install gnome-shell-extension-weather
	
### [Fedora](http://download1.rpmfusion.org/free/fedora/updates/testing/17/i386/repoview/gnome-shell-extension-weather.html)

Packages for Fedora 16 (*Verne*) and Fedora 17 (*Beefy Miracle*) are available in the [RPM Fusion](http://rpmfusion.org/) repositories. If these are not enabled on your system, please install them through the following command (root password required):

	su -c 'yum localinstall --nogpgcheck http://download1.rpmfusion.org/free/fedora/rpmfusion-free-release-stable.noarch.rpm http://download1.rpmfusion.org/nonfree/fedora/rpmfusion-nonfree-release-stable.noarch.rpm'
Then, install *gnome-shell-extension-weather* (root password required):

	su -c 'yum --enablerepo=rpmfusion-free-updates-testing install gnome-shell-extension-weather'

### [Arch Linux](https://aur.archlinux.org/packages.php?ID=56028)

Download the package from AUR, make and install it:

	wget https://aur.archlinux.org/packages/gn/gnome-shell-extension-weather-neroth-git/gnome-shell-extension-weather-neroth-git.tar.gz
	tar xvzf gnome-shell-extension-weather-neroth-git.tar.gz
	cd gnome-shell-extension-weather-neroth-git && makepkg -si

### [ALT Linux](http://packages.altlinux.org/en/Sisyphus/srpms/gnome-shell-extension-weather)

Install *gnome-shell-extension-weather* with apt-rpm from Sisyphus:

	sudo apt-get update
	sudo apt-get install gnome-shell-extension-weather
	
## Generic

Make sure you have the following dependencies installed:
* *dconf*,
* *gettext*,
* *pkg-config*,
* *seed*,
* *git*,
* *glib2*,
* *gnome-common*,
* *autoconf*,
* *automake*,
* *intltool*,
* *gnome-tweak-tool*.

Run the following commands:

	cd ~ && git clone git://github.com/Neroth/gnome-shell-extension-weather.git
	cd ~/gnome-shell-extension-weather
	./autogen.sh --prefix=/usr && make && sudo make install

----

# Configuration

Use the `Weather Settings` button to edit the configuration.

![Screenshot](https://github.com/neroth/gnome-shell-extension-weather/raw/master/data/weather-settings.gif)

You can also use *dconf-editor* or *gsettings* to configure the extension through the command line.

----

# Licence

Copyright (C) 2011 - 2012

* Ecyrbe <ecyrbe+spam@gmail.com>,
* Timur Kristóf <venemo@msn.com>,
* Elad Alfassa <elad@fedoraproject.org>,
* Simon Legner <Simon.Legner@gmail.com>,
* Simon Claessens <gagalago@gmail.com>,
* Christian Metzler <neroth@xeked.com>,
* Mark Benjamin <weather.gnome.Markie1@dfgh.net>

This file is part of *gnome-shell-extension-weather*.

*gnome-shell-extension-weather* is free software: you can redistribute it and/or modify it under the terms of the **GNU General Public License as published by the Free Software Foundation, either version 3** of the License, or (at your option) any later version.

*gnome-shell-extension-weather* is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with *gnome-shell-extension-weather*.  If not, see <http://www.gnu.org/licenses/>.