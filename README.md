## gnome-shell-extension-weather

gnome-shell-extension-weather is a simple extension for displaying weather notifications in GNOME Shell.

Currently, the weather report including forecast for today and tomorrow is fetched from [Yahoo! Weather](http://weather.yahoo.com/).

----

### Screenshots

![Screenshot](gnome-shell-extension-weather/raw/master/data/screenshot.png)

And with French translation:  

![Screenshot](gnome-shell-extension-weather/raw/master/data/screenshot2.png)

----

### Installation

For installation, run the following commands:

    ./autogen.sh --prefix=/usr
    make
    sudo make install
  
That's it!

----

### Configuration

gnome-shell-extension-weather uses gsettings to save your configuration. You can use `dconf-editor` or `gsettings` from the command line to modify some parameters.

#### Location (cf. [WOEID](http://developer.yahoo.com/geo/geoplanet/guide/concepts.html))

You can specify your location using the following command:

    gsettings set org.gnome.shell.extensions.weather woeid your_woeid

#### Temperature Units (optional, celsius by default)

You can modify the temperature unit using one of the following commands:

    gsettings set org.gnome.shell.extensions.weather unit celsius
    gsettings set org.gnome.shell.extensions.weather unit fahrenheit

#### Displayed Location (optional)

Sometimes your WOEID location isn't quite right (it's the next major city around). To customise the displayed city you can type:

    gsettings set org.gnome.shell.extensions.weather city your_city

#### Translate Weather Conditions (optional, true by default)

You may want to configure whether to translate the weather condition. If enabled, the condition is translated based on the weather code. If disabled, the condition string from Yahoo is taken. Note: Enabling the translation sometimes results in loss of accuracy, e.g., the condition string "PM Thunderstorms" cannot be expressed in terms of weather codes.

    gsettings set org.gnome.shell.extensions.weather translate-condition true
    gsettings set org.gnome.shell.extensions.weather translate-condition false

#### Use Symbolic Icons (optional, false by default)

If desired, you can enable the usage of symbolic icons to display the weather condition (instead of full-colored icons).

    gsettings set org.gnome.shell.extensions.weather use-symbolic-icons false
    gsettings set org.gnome.shell.extensions.weather use-symbolic-icons true

#### Show Text in Panel (optional, true by default)

You can configure whether to show the weather condition text together with the temperature in the panel (requires restart of GNOME Shell).

    gsettings set org.gnome.shell.extensions.weather show-text-in-panel true
    gsettings set org.gnome.shell.extensions.weather show-text-in-panel false

#### Position in Panel (optional, center by default)

The position of this GNOME Shell extension in the panel can be configured to either 'center' or 'right' (requires restart of GNOME Shell).

    gsettings set org.gnome.shell.extensions.weather position-in-panel center
    gsettings set org.gnome.shell.extensions.weather position-in-panel right

#### Restart GNOME Shell

Don't forget to restart GNOME Shell:

1. Restart GNOME Shell (`[Alt]+[F2]`, `r`)
2. Fork this project as you like

----

### Licence

Copyright (C) 2011
Ecyrbe <ecyrbe+spam@gmail.com>,
Timur Kristóf <venemo@msn.com>,
Elad Alfassa <elad@fedoraproject.org>,
Simon Legner <Simon.Legner@gmail.com>,
Simon Claessens <gagalago@gmail.com>

This file is part of gnome-shell-extension-weather.

gnome-shell-extension-weather is free software: you can redistribute it and/or modify it under the terms of the **GNU General Public License as published by the Free Software Foundation, either version 3** of the License, or (at your option) any later version.

gnome-shell-extension-weather is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with gnome-shell-extension-weather.  If not, see <http://www.gnu.org/licenses/>.

