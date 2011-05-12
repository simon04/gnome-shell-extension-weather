
// Weather extension for Gnome shell
// ----------
// - Displays a small weather information on the top panel
// - On click, gives a popup with details about the weather
// ----------
/*
    Copyright (C) 2011 Timur Kristóf <venemo@msn.com>, Elad Alfassa <elad@fedoraproject.org>

    This file is part of gnome-shell-extension-weather.

    gnome-shell-extension-weather is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Foobar is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with gnome-shell-extension-weather.  If not, see <http://www.gnu.org/licenses/>.

*/

const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Cairo = imports.cairo;
const Clutter = imports.gi.Clutter;
const Shell = imports.gi.Shell;
const St = imports.gi.St;
const Gettext = imports.gettext.domain('gnome-shell');
const _ = Gettext.gettext;

const Json = imports.gi.Json;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Soup = imports.gi.Soup;
const Util = imports.misc.util;

const YAHOO_ID = 'AUXX0010';
const WEATHER_URL = 'http://weather.yahooapis.com/forecastjson?u=c&p=' + YAHOO_ID;


function WeatherMenuButton() {
    this._init();
}

WeatherMenuButton.prototype = {
    __proto__: PanelMenu.Button.prototype,

    _init: function() {
    
        // Panel icon
        this._weatherIcon = new St.Icon({
            icon_type: St.IconType.FULLCOLOR,
            icon_size: Main.panel.button.get_child().height - 4,
            icon_name: 'view-refresh-symbolic',
            style_class: 'weather-icon' + (Main.panel.actor.get_direction() == St.TextDirection.RTL ? '-rtl' : '')
        });
        
        // Label
        this._weatherInfo = new St.Label({ text: _('...') });

        // Panel menu item - the current class
        let menuAlignment = 0.25;
        if (St.Widget.get_default_direction() == St.TextDirection.RTL)
            menuAlignment = 1.0 - menuAlignment;
        PanelMenu.Button.prototype._init.call(this, menuAlignment);

        // Putting the panel item together
        let topBox = new St.BoxLayout();        
        topBox.add_actor(this._weatherIcon);
        topBox.add_actor(this._weatherInfo);
        this.actor.set_child(topBox);

        // Current weather
        this._currentWeather = new St.Bin();
        // Future weather
        this._futureWeather = new St.Bin();
        
        // Separator (copied from Gnome shell's popupMenu.js)
        this._separatorArea = new St.DrawingArea({ style_class: 'popup-separator-menu-item' });
        this._separatorArea.width = 200;
        this._separatorArea.connect('repaint', Lang.bind(this, this._onSeparatorAreaRepaint));
        
        // Putting the popup item together
        let mainBox = new St.BoxLayout({vertical: true});
        mainBox.add_actor(this._currentWeather);
        mainBox.add_actor(this._separatorArea);
        //mainBox.add_actor(this._futureWeather);
        
        this.menu.addActor(mainBox);
        
        // Items
        this.showLoadingUi();
        
        this.rebuildCurrentWeatherUi();

        // Show weather
        this.refreshWeather();

    },

    get_weather_icon: function(code) {
        switch (parseInt(code, 10)){
            case 4:
                return 'weather-storm';
            case 5:
            case 10:
            case 11:
            case 12:
            case 39:
            case 40:
                return 'weather-showers';
            case 26:
                return 'weather-overcast';
            case 28:
            case 30:
            case 44:
                return 'weather-few-clouds';
            case 32:
            case 34:
            case 36:
                return 'weather-clear';
            default:
                return 'weather-snow';
        }
    },

    
    refreshWeather: function() {

        // Fetching current weather
        let weather;
        {
            var session = new Soup.SessionSync();
            var message = Soup.Message.new('GET', WEATHER_URL);
            stat = session.send_message(message);
            jp = new Json.Parser();
            jp.load_from_data(message.response_body.data, -1);
            weather = jp.get_root().get_object();
        }

        /*
        weather.constructor.prototype.get_data = function(a, b) {
            return weather.get_object_member(a).get_strig_member(b);
        };
        */

        // Refreshing current weather
        let location = weather.get_object_member('location').get_string_member('city');
        let comment = weather.get_object_member('condition').get_string_member('text');
        let temperature = weather.get_object_member('condition').get_double_member('temperature');
        let temperature_unit = weather.get_object_member('units').get_string_member('temperature');
        let humidity = weather.get_object_member('atmosphere').get_string_member('humidity') + ' %';
        let pressure = weather.get_object_member('atmosphere').get_double_member('pressure');
        let pressure_unit = weather.get_object_member('units').get_string_member('pressure');
        let wind_direction = weather.get_object_member('wind').get_string_member('direction');
        let wind = weather.get_object_member('wind').get_double_member('speed');
        let wind_unit = weather.get_object_member('units').get_string_member('speed');
        let iconname = this.get_weather_icon(weather.get_object_member('condition').get_string_member('code'));
        
        this._currentWeatherIcon.icon_name = this._weatherIcon.icon_name = iconname;
        this._weatherInfo.text = (comment + ', ' + temperature + ' ' + temperature_unit);
        
        this._currentWeatherSummary.text = comment;
        this._currentWeatherLocation.text = location;
        this._currentWeatherTemperature.text = _('Temperature') + ': ' + temperature + ' ' + temperature_unit;
        this._currentWeatherHumidity.text = _('Humidity') + ': ' + humidity;
        this._currentWeatherPressure.text = _('Pressure') + ': ' + pressure + ' ' + pressure_unit;
        this._currentWeatherWind.text = _('Wind') + ': ' + wind_direction + ' ' + wind + ' ' + wind_unit;

        // Repeatedly refresh weather
        here = this;
        Mainloop.timeout_add(1000*60*4, function() {
            here.refreshWeather();
        });
        
    },
    
    destroyCurrentWeather: function() {
        if (this._currentWeather.get_child() != null)
            this._currentWeather.get_child().destroy();        
    },
    
    destroyFutureWeather: function() {
        if (this._futureWeather.get_child() != null)
            this._futureWeather.get_child().destroy();        
    },
    
    showLoadingUi: function() {
        this.destroyCurrentWeather();
        this.destroyFutureWeather();
        this._currentWeather.set_child(new St.Label({ text: _('Loading current weather ...') }));
        this._futureWeather.set_child(new St.Label({ text: _('Loading future weather ...') }));
    },
    
    rebuildCurrentWeatherUi: function() {
        this.destroyCurrentWeather();
        
        // This will hold the icon for the current weather
        this._currentWeatherIcon = new St.Icon({
            icon_type: St.IconType.FULLCOLOR,
            icon_size: 64,
            icon_name: 'view-refresh-symbolic',
            style_class: 'weather-current-icon'
        });
        
        // The summary of the current weather
        this._currentWeatherSummary = new St.Label({
            text: 'Loading...',
            style_class: 'weather-current-summary'
        });
        this._currentWeatherLocation = new St.Label({ text: _('Please wait') });

        let bb = new St.BoxLayout({vertical: true, style_class: 'weather-current-summarybox'});
        bb.add_actor(this._currentWeatherLocation);
        bb.add_actor(this._currentWeatherSummary);
        
        // Other labels
        this._currentWeatherTemperature = new St.Label({ text: _('Temperature') + ': ...' });
        this._currentWeatherHumidity = new St.Label({ text: _('Humidity') + ': ...' });
        this._currentWeatherPressure = new St.Label({ text: _('Pressure') + ': ...' });
        this._currentWeatherWind = new St.Label({ text: _('Wind') + ': ...' });
        
        let rb = new St.BoxLayout({vertical: true, style_class: 'weather-current-databox'});
        rb.add_actor(this._currentWeatherTemperature);
        rb.add_actor(this._currentWeatherHumidity);
        rb.add_actor(this._currentWeatherPressure);
        rb.add_actor(this._currentWeatherWind);
        
        let xb = new St.BoxLayout();
        xb.add_actor(bb);
        xb.add_actor(rb);
        
        let box = new St.BoxLayout({style_class: 'weather-current-iconbox'});
        box.add_actor(this._currentWeatherIcon);
        box.add_actor(xb);
        this._currentWeather.set_child(box);
        
    },
    
    rebuildFutureWeatherUi: function() {
        
    },
    
    // Copied from Gnome shell's popupMenu.js
    _onSeparatorAreaRepaint: function(area) {
        let cr = area.get_context();
        let themeNode = area.get_theme_node();
        let [width, height] = area.get_surface_size();
        let margin = themeNode.get_length('-margin-horizontal');
        let gradientHeight = themeNode.get_length('-gradient-height');
        let startColor = themeNode.get_color('-gradient-start');
        let endColor = themeNode.get_color('-gradient-end');

        let gradientWidth = (width - margin * 2);
        let gradientOffset = (height - gradientHeight) / 2;
        let pattern = new Cairo.LinearGradient(margin, gradientOffset, width - margin, gradientOffset + gradientHeight);
        pattern.addColorStopRGBA(0, startColor.red / 255, startColor.green / 255, startColor.blue / 255, startColor.alpha / 255);
        pattern.addColorStopRGBA(0.5, endColor.red / 255, endColor.green / 255, endColor.blue / 255, endColor.alpha / 255);
        pattern.addColorStopRGBA(1, startColor.red / 255, startColor.green / 255, startColor.blue / 255, startColor.alpha / 255);
        cr.setSource(pattern);
        cr.rectangle(margin, gradientOffset, gradientWidth, gradientHeight);
        cr.fill();
    }
};

function main() {
    this._weatherMenu = new WeatherMenuButton();
    Main.panel._centerBox.add(this._weatherMenu.actor, { y_fill: true });
}

