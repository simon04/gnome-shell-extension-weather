## cinnamon-weather

cinnamon-weather is a simple applet for displaying weather notifications in Cinnamon.

Currently, the weather report including forecast for today and tomorrow is fetched from [Yahoo! Weather](http://weather.yahoo.com/).

----

### Installation

* Generic: For a generic installation, run the following commands:
  `./test`  

That's it!

### Configuration

cinnamon-weather uses gsettings to save your configuration. You can use `gsettings` from the command line with tab completion.

#### Location

At the moment, only WOEIDs consisting of 4 uppercase letters followed by 4 digits are supported. Determine your WOEID using [edg3.co.uk](http://edg3.co.uk/snippets/weather-location-codes/) or [xoap.weather.com](http://xoap.weather.com/search/search?where=Innsbruck).

You can specify your location using the following command. Perhaps you need quotation marks as in the second command.

    gsettings set cinnamon-weather@mockturtl woeid your_woeid
    gsettings set cinnamon-weather@mockturtl woeid "'your_woeid'"

#### Temperature Units (optional, celsius by default)

You can modify the temperature unit using one of the following commands:

    gsettings set cinnamon-weather@mockturtl unit celsius
    gsettings set cinnamon-weather@mockturtl unit fahrenheit

#### Wind Speed Units (optional, kilometers per hour (km/h) by default)

You can modify the wind speed unit using one of the following commands:

    gsettings set cinnamon-weather@mockturtl wind-speed-unit kph
    gsettings set cinnamon-weather@mockturtl wind-speed-unit mph
    gsettings set cinnamon-weather@mockturtl wind-speed-unit m/s
    gsettings set cinnamon-weather@mockturtl wind-speed-unit knots

#### Displayed Location (optional)

Sometimes your WOEID location isn't quite right (it's the next major city around). To customise the displayed city you can type:

    gsettings set cinnamon-weather@mockturtl city your_city

#### Translate Weather Conditions (optional, true by default)

You may want to configure whether to translate the weather condition. If enabled, the condition is translated based on the weather code. If disabled, the condition string from Yahoo is taken. Note: Enabling the translation sometimes results in loss of accuracy, e.g., the condition string "PM Thunderstorms" cannot be expressed in terms of weather codes.

    gsettings set cinnamon-weather@mockturtl translate-condition true
    gsettings set cinnamon-weather@mockturtl translate-condition false

#### Use Symbolic Icons (optional, false by default)

If desired, you can enable the usage of symbolic icons to display the weather condition (instead of full-colored icons).

    gsettings set cinnamon-weather@mockturtl use-symbolic-icons false
    gsettings set cinnamon-weather@mockturtl use-symbolic-icons true

#### Show Text in Panel (optional, true by default)

You can configure whether to show the weather condition text (aka. comment) together with the temperature in the panel (requires restart). If only weather condition text is undesired, consider show-comment-in-panel option.

    gsettings set cinnamon-weather@mockturtl show-text-in-panel true
    gsettings set cinnamon-weather@mockturtl show-text-in-panel false

#### Show Comment in Panel (optional, false by default)

Configures whether to show the comment (aka. weather condition text, e.g. "Windy", "Clear") in the panel. Note that the temperature is still shown (if undesired, consider show-text-in-panel option).

    gsettings set cinnamon-weather@mockturtl show-comment-in-panel false
    gsettings set cinnamon-weather@mockturtl show-comment-in-panel true

#### Refresh Interval (optional, 240 by default)

The interval to refresh the weather information may be set arbitrarily and is specified in seconds.

    gsettings set cinnamon-weather@mockturtl refresh-interval 240

#### Restart Cinnamon

Don't forget to restart Cinnamon:

1. Restart Cinnamon (`[Alt]+[F2]`, `r`)
2. Fork this project as you like
