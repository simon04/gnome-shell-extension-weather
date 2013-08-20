# Weather Extension V2

![Screenshot](https://f.cloud.github.com/assets/1255506/833069/0f754966-f28b-11e2-9fb3-3ea413919c69.png)

*gnome-shell-extension-weather* is a simple extension for displaying weather conditions and forecasts in GNOME Shell, featuring support for multiple locations, no need for WOEID, a symmetrical layout and a settings panel through *gnome-shell-extension-prefs*.

The weather report include forecasts for ~ 10 days.

Support GNOME Shell >= 3.8

Contact the author : [Neroth (Christian METZLER)](https://plus.google.com/u/0/106579473281691119257).

We need translator ! [Translate the extension](https://github.com/Neroth/gnome-shell-extension-weather/wiki/Translate).

----

# Installation

## Through extensions.gnome.org (Local installation)

**Waiting for review / Version 9 : V1 (<= GNOME Shell 3.8) / Version 10 : V2 (>= GNOME Shell 3.8)**

Go on the [Weather extension page](https://extensions.gnome.org/extension/613/weather/) on extensions.gnome.org, click on the switch ("OFF" => "ON"), click on the install button.
That's it !

## Through a package manager

After the installation, restart GNOME Shell (`Alt`+`F2`, `r`, `Enter`) and enable the extension through *gnome-tweak-tool*.

### [Ubuntu, Mint, and derivatives](https://launchpad.net/~gnome-shell-extensions/+archive/ppa/+packages)

Add the PPA *ppa:gnome-shell-extensions* to your source list, update the package list and install *gnome-shell-extension-weather*:

	sudo add-apt-repository ppa:gnome-shell-extensions
	sudo apt-get update
	sudo apt-get install gnome-shell-extension-weather

### [Debian](http://packages.debian.org/source/unstable/gnome-shell-extension-weather)

For Debian "Wheezy" 7, add the (official backports archive)[http://backports.debian.org/Instructions/] to your sources list. This step is not needed for Debian "Jessie" or "Sid".

Then install the package through APT:

	sudo apt-get install gnome-shell-extension-weather

### [Fedora](http://rpmfusion.org/)

Packages for Fedora are available in the [RPM Fusion](http://rpmfusion.org/) repositories. If these are not enabled on your system, please install them through the following command (root password required):

	su -c 'yum localinstall --nogpgcheck http://download1.rpmfusion.org/free/fedora/rpmfusion-free-release-stable.noarch.rpm http://download1.rpmfusion.org/nonfree/fedora/rpmfusion-nonfree-release-stable.noarch.rpm'
Then, install *gnome-shell-extension-weather* (root password required):

	su -c 'yum install gnome-shell-extension-weather'

### [Arch Linux](https://aur.archlinux.org/packages/gnome-shell-extension-weather-git/)

Download the package from AUR, make and install it:

	wget https://aur.archlinux.org/packages/gn/gnome-shell-extension-weather-git/gnome-shell-extension-weather-git.tar.gz
	tar xvzf gnome-shell-extension-weather-git.tar.gz
	cd gnome-shell-extension-weather-git && makepkg -si
	
## Generic (Local installation)

Make sure you have the following dependencies installed:
* *gettext*,
* *pkg-config*,
* *git*,
* *glib2*,
* *glib2-devel* or *libglib2.0-dev*,
* *zip*,
* *gnome-common*,
* *autoconf*,
* *automake*,
* *intltool*,
* *gir1.2-gweather-3.0*.

Run the following commands:

	cd ~ && git clone git://github.com/Neroth/gnome-shell-extension-weather.git
	cd ~/gnome-shell-extension-weather
	./autogen.sh && make local-install
	
Restart GNOME Shell (`Alt`+`F2`, `r`, `Enter`) and enable the extension through *gnome-tweak-tool*.

----

# Configuration

Launch *gnome-shell-extension-prefs* (reachable also through the *Weather Settings* button on the extension popup) and select *Weather* from the drop-down menu to edit the configuration.

![Screenshot](https://github.com/neroth/gnome-shell-extension-weather/raw/master/data/weather-settings.gif)

You can also use *dconf-editor* or *gsettings* to configure the extension through the command line.

----

# Debug

To debug the extension, active the switch `Debug extension` in the settings:

You have now two new file ("weather.log" and "weather-prefs.log") in the extension dir (`~/.local/share/gnome-shell/extensions/weather-extension@xeked.com/`).

----

# Licence

Copyright (C) 2011 - 2013

* Christian Metzler <neroth@xeked.com>,
* Elad Alfassa <elad@fedoraproject.org>,
* Mark Benjamin <weather.gnome.Markie1@dfgh.net>,
* Simon Claessens <gagalago@gmail.com>,
* Ecyrbe <ecyrbe+spam@gmail.com>,
* Timur Kristóf <venemo@msn.com>,
* Simon Legner <Simon.Legner@gmail.com>,
* Mattia Meneguzzo <odysseus@fedoraproject.org>.

This file is part of *gnome-shell-extension-weather*.

*gnome-shell-extension-weather* is free software: you can redistribute it and/or modify it under the terms of the **GNU General Public License as published by the Free Software Foundation, either version 3** of the License, or (at your option) any later version.

*gnome-shell-extension-weather* is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with *gnome-shell-extension-weather*.  If not, see <http://www.gnu.org/licenses/>.
