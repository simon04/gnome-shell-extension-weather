## cinnamon-weather

Adaptation of Gnome Shell's [weather extension](https://github.com/simon04/gnome-shell-extension-weather) for the [Cinnamon](http://cinnamon.linuxmint.com) desktop.

cinnamon-weather uses [Semantic Versioning](http://semver.org/).  For the current version number, see `metadata.json`.  

----

### Requirements

* [msgfmt](http://refspecs.linuxbase.org/LSB_4.1.0/LSB-Core-generic/LSB-Core-generic/msgfmt.html)
* [glib-compile-schemas](http://developer.gnome.org/gio/2.30/glib-compile-schemas.html) 

###### _Arch_

`pacman -S gettext glib2`

###### _Debian, Ubuntu_

`apt-get install gettext libglib2.0-bin`

###### _Fedora_

`yum install gettext glib2`

###### _openSUSE_

`zypper install gettext-tools glib2-tools`

### Installation

_If you are upgrading from version 1.3.2 or older, please run `./cleanup`._

Run `./install`.  

Restart Cinnamon (`[Alt]+[F2]`, `r`).  

### Configuration

Click the gear icon in the menu to launch `cinnamon-weather-settings`, or use `gsettings` from the command line, with tab completion.

### [Mailing list](http://groups.google.com/group/cinnamon-weather)
