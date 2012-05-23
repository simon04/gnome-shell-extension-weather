![Screenshot](https://github.com/neroth/gnome-shell-extension-weather/raw/master/data/Screenshot.jpg)

**gnome-shell-extension-weather** is a simple extension for displaying weather information from several cities in GNOME Shell.

Compared to the original version, this fork brings you : multiple city, no WOEID, a symmetric style, and a settings panel in JavaScript (Seed).

Currently, the weather report including forecast for today and tomorrow is fetched from [Yahoo! Weather](http://weather.yahoo.com/).

----

# Installation

**At end of installation restart GNOME Shell (`[Alt]+[F2]`, `r`) and active the extension in `gnome-tweak-tool`.**

## Package manager

### [Arch Linux](https://aur.archlinux.org/packages.php?ID=56028)

Make package form AUR and install.

	wget https://aur.archlinux.org/packages/gn/gnome-shell-extension-weather-neroth-git/gnome-shell-extension-weather-neroth-git.tar.gz
	tar xvzf gnome-shell-extension-weather-neroth-git.tar.gz
	cd gnome-shell-extension-weather-neroth-git && makepkg -si

### [Ubuntu](https://launchpad.net/~xeked/+archive/gnome/+packages)

Add the PPA **ppa:xeked/gnome** in your source list, add key **0B5C004838624188** form `keyserver.ubuntu.com`, update package list and install **gnome-shell-extension-weather**.

	sudo add-apt-repository ppa:xeked/gnome
	sudo apt-key adv --recv-keys --keyserver keyserver.ubuntu.com 0B5C004838624188
	sudo apt-get update
	sudo apt-get install gnome-shell-extension-weather

### [ALT Linux](http://packages.altlinux.org/en/Sisyphus/srpms/gnome-shell-extension-weather)

Install **gnome-shell-extension-weather** with apt-rpm from Sisyphus.

	sudo apt-get update
	sudo apt-get install gnome-shell-extension-weather

### [Fedora](https://bugzilla.rpmfusion.org/show_bug.cgi?id=2017#c40)

Download the [rpm file](http://db.tt/p5ByBdyZ) and execute it.

## Generic

Make sure you have these dependencies :
* `dconf`.
* `gettext`.
* `pkg-config`.
* `seed`.
* `git`.
* `glib2`.
* `gnome-common`.
* `autoconf`.
* `automake`.
* `intltool`.
* `gnome-tweak-tool`.

Run the following commands :

	cd ~ && git clone git://github.com/Neroth/gnome-shell-extension-weather.git
	cd ~/gnome-shell-extension-weather
	./autogen.sh --prefix=/usr && make && sudo make install

----

# Configuration

Use the `Weather Settings` button to edit the configuration.

![Screenshot](https://github.com/neroth/gnome-shell-extension-weather/raw/master/data/weather-settings.gif)

You can also use `dconf-editor` or `gsettings` to modify some parameters from the command line.

----

# Licence

Copyright (C) 2011 - 2012

* Ecyrbe <ecyrbe+spam@gmail.com>,
* Timur Kristóf <venemo@msn.com>,
* Elad Alfassa <elad@fedoraproject.org>,
* Simon Legner <Simon.Legner@gmail.com>,
* Simon Claessens <gagalago@gmail.com>,
* Christian METZLER <neroth@xeked.com>,
* Mark Benjamin <weather.gnome.Markie1@dfgh.net>

This file is part of gnome-shell-extension-weather.

gnome-shell-extension-weather is free software: you can redistribute it and/or modify it under the terms of the **GNU General Public License as published by the Free Software Foundation, either version 3** of the License, or (at your option) any later version.

gnome-shell-extension-weather is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with gnome-shell-extension-weather.  If not, see <http://www.gnu.org/licenses/>.
