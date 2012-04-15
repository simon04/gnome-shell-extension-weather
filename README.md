## gnome-shell-extension-weather

gnome-shell-extension-weather is a simple extension for displaying weather notifications in GNOME Shell.

Currently, the weather report including forecast for today and tomorrow is fetched from [Yahoo! Weather](http://weather.yahoo.com/).

----

### Screenshots

![Screenshot](https://github.com/Odysseus86/gnome-shell-extension-weather/raw/master/data/screenshot.png)

----

### Installation

* [Arch Linux](https://aur.archlinux.org/packages.php?ID=49409)
* [Frugalware](http://www.frugalware.org/packages/119339)
* [Ubuntu](https://launchpad.net/~webupd8team/+archive/gnome3/+packages)
* Generic: For a generic installation, run the following commands:
  `./autogen.sh --prefix=/usr && make && sudo make install`
  * Make sure you have the `libglib2.0-dev` package (or equivalent for your distribution)
    installed, or else you'll get an error about `GLIB_GSETTINGS`.
* *Please report further links!*

That's it!

### Compatibility

This extension works under GNOME 3.2 only.

----

### Configuration

gnome-shell-extension-weather uses gsettings to save your configuration. You can use `dconf-editor` or `gsettings` from the command line to modify some parameters.

#### WOEID

At the moment, only WOEIDs consisting of 4 uppercase letters followed by 4 digits are supported. Determine your WOEID using [edg3.co.uk](http://edg3.co.uk/snippets/weather-location-codes/) or [xoap.weather.com](http://xoap.weather.com/search/search?where=Innsbruck).

You can specify your location using the following command. Perhaps you need quotation marks as in the second command.

    gsettings set org.gnome.shell.extensions.weather woeid your_woeid
    gsettings set org.gnome.shell.extensions.weather woeid "'your_woeid'"

#### Temperature unit (optional, celsius by default)

You can modify the temperature unit using one of the following commands:

    gsettings set org.gnome.shell.extensions.weather unit celsius
    gsettings set org.gnome.shell.extensions.weather unit fahrenheit

#### Wind speed unit (optional, kilometers per hour (km/h) by default)

You can modify the wind speed unit using one of the following commands:

    gsettings set org.gnome.shell.extensions.weather wind-speed-unit kph
    gsettings set org.gnome.shell.extensions.weather wind-speed-unit mph
    gsettings set org.gnome.shell.extensions.weather wind-speed-unit m/s
    gsettings set org.gnome.shell.extensions.weather wind-speed-unit knots

#### Use 24 h time format (optional, false by default)

You may want to display times in 24 h format (e.g. "19.45") instead of AM/PM format (i.e. "7.45 PM").

    gsettings set org.gnome.shell.extensions.weather use-24h-time-format true
    gsettings set org.gnome.shell.extensions.weather use-24h-time-format false

#### Override location label (optional)

Sometimes your WOEID location isn't quite right (it's the next major city around). To customise the displayed city you can type:

    gsettings set org.gnome.shell.extensions.weather city your_city

#### Position in panel (optional, center by default)

The position of this GNOME Shell extension in the panel can be configured to either 'left', 'center' or 'right' (requires restart of GNOME Shell).

    gsettings set org.gnome.shell.extensions.weather position-in-panel center
    gsettings set org.gnome.shell.extensions.weather position-in-panel left
    gsettings set org.gnome.shell.extensions.weather position-in-panel right

#### Translate weather conditions (optional, true by default)

You may want to configure whether to translate the weather condition. If enabled, the condition is translated based on the weather code. If disabled, the condition string from Yahoo! is taken. Note: Enabling the translation sometimes results in loss of accuracy, e.g., the condition string "PM Thunderstorms" cannot be expressed in terms of weather codes.

    gsettings set org.gnome.shell.extensions.weather translate-condition true
    gsettings set org.gnome.shell.extensions.weather translate-condition false

#### Show sunrise and sunset times (optional, true by default)

You may display today's sunrise and sunset times as retrieved from Yahoo! Weather in the current weather panel

    gsettings set org.gnome.shell.extensions.weather show-sunrise-sunset true
    gsettings set org.gnome.shell.extensions.weather show-sunrise-sunset false

#### Show latest update time (optional, false by default)

If desired, you can display the latest weather data update time. Note that here we are referring to the last time Yahoo! Weather updated the weather information, not to the last time the extension fetched it.

    gsettings set org.gnome.shell.extensions.weather display-last-build-time false
    gsettings set org.gnome.shell.extensions.weather display-last-build-time true

#### Use symbolic icons (optional, false by default)

If desired, you can enable the usage of symbolic icons to display the weather condition (instead of full-colored icons).

    gsettings set org.gnome.shell.extensions.weather use-symbolic-icons false
    gsettings set org.gnome.shell.extensions.weather use-symbolic-icons true

#### Show text in panel (optional, true by default)

You can configure whether to show the weather condition text (aka. comment) together with the temperature in the panel (requires restart). If only weather condition text is undesired, consider show-comment-in-panel option.

    gsettings set org.gnome.shell.extensions.weather show-text-in-panel true
    gsettings set org.gnome.shell.extensions.weather show-text-in-panel false

#### Include condition (optional, false by default)

Configures whether to show the comment (aka. weather condition text, e.g. "Windy", "Clear") in the panel. Note that the temperature is still shown (if undesired, consider show-text-in-panel option).

    gsettings set org.gnome.shell.extensions.weather show-comment-in-panel false
    gsettings set org.gnome.shell.extensions.weather show-comment-in-panel true

#### Refresh interval (optional, 240 by default)

The interval to refresh the weather information may be set arbitrarily and is specified in seconds.

    gsettings set org.gnome.shell.extensions.weather refresh-interval 240

#### Restart GNOME Shell

Don't forget to restart GNOME Shell:

1. Restart GNOME Shell (`[Alt]+[F2]`, `r`)
2. Fork this project as you like

----

### Licence

Copyright (C) 2011-2012
Ecyrbe <ecyrbe+spam@gmail.com>,
Timur Kristóf <venemo@msn.com>,
Elad Alfassa <elad@fedoraproject.org>,
Simon Legner <Simon.Legner@gmail.com>,
Simon Claessens <gagalago@gmail.com>,
Mark Benjamin <weather.gnome.Markie1@dfgh.net>,
Mattia Meneguzzo <hal8600@hotmail.it>

This file is part of gnome-shell-extension-weather.

gnome-shell-extension-weather is free software: you can redistribute it and/or modify it under the terms of the **GNU General Public License as published by the Free Software Foundation, either version 3** of the License, or (at your option) any later version.

gnome-shell-extension-weather is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with gnome-shell-extension-weather.  If not, see <http://www.gnu.org/licenses/>.

