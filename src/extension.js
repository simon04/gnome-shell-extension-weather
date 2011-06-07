/*
 *
 *  Weather extension for GNOME Shell
 *  - Displays a small weather information on the top panel.
 *  - On click, gives a popup with details about the weather.
 *
 * Copyright (C) 2011
 *     ecyrbe <ecyrbe+spam@gmail.com>,
 *     Timur Kristof <venemo@msn.com>,
 *     Elad Alfassa <elad@fedoraproject.org>,
 *     Simon Legner <Simon.Legner@gmail.com>
 *
 *
 * This file is part of gnome-shell-extension-weather.
 *
 * gnome-shell-extension-weather is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * gnome-shell-extension-weather is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with gnome-shell-extension-weather.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

const Cairo = imports.cairo;
const Gettext = imports.gettext.domain('gnome-shell-extension-weather');
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Json = imports.gi.Json;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Soup = imports.gi.Soup;
const St = imports.gi.St;
const Util = imports.misc.util;
const _ = Gettext.gettext;

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

// Settings
const WEATHER_SETTINGS_SCHEMA = 'org.gnome.shell.extensions.weather';
const WEATHER_UNIT_KEY = 'unit';
const WEATHER_CITY_KEY = 'city';
const WEATHER_WOEID_KEY = 'woeid';
const WEATHER_TRANSLATE_CONDITION_KEY = 'translate-condition';
const WEATHER_USE_SYMBOLIC_ICONS_KEY = 'use-symbolic-icons';
const WEATHER_SHOW_TEXT_IN_PANEL_KEY = 'show-text-in-panel';
const WEATHER_POSITION_IN_PANEL_KEY = 'position-in-panel';
const WEATHER_SHOW_COMMENT_IN_PANEL_KEY = 'show-comment-in-panel';

// Keep enums in sync with GSettings schemas
const WeatherUnits = {
    CELSIUS: 0,
    FAHRENHEIT: 1
}
const WeatherPosition = {
    CENTER: 0,
    RIGHT: 1
}

function WeatherMenuButton() {
    this._init();
}

function getSettings(schema) {
    if (Gio.Settings.list_schemas().indexOf(schema) == -1)
        throw _("Schema \"%s\" not found.").format(schema);
    return new Gio.Settings({ schema: schema });
}

WeatherMenuButton.prototype = {
    __proto__: PanelMenu.Button.prototype,

    _init: function() {
        // Load settings
        this._settings = getSettings(WEATHER_SETTINGS_SCHEMA);
        this._units = this._settings.get_enum(WEATHER_UNIT_KEY);
        this._city  = this._settings.get_string(WEATHER_CITY_KEY);
        this._woeid = this._settings.get_string(WEATHER_WOEID_KEY);
        this._translate_condition = this._settings.get_boolean(WEATHER_TRANSLATE_CONDITION_KEY);
        this._icon_type = this._settings.get_boolean(WEATHER_USE_SYMBOLIC_ICONS_KEY) ? St.IconType.SYMBOLIC : St.IconType.FULLCOLOR;
        this._text_in_panel = this._settings.get_boolean(WEATHER_SHOW_TEXT_IN_PANEL_KEY);
        this._position_in_panel = this._settings.get_enum(WEATHER_POSITION_IN_PANEL_KEY);
        this._comment_in_panel = this._settings.get_boolean(WEATHER_SHOW_COMMENT_IN_PANEL_KEY);
        
        // Watch settings for changes
        let load_settings_and_refresh_weather = Lang.bind(this, function() {
            this._units = this._settings.get_enum(WEATHER_UNIT_KEY);
            this._city  = this._settings.get_string(WEATHER_CITY_KEY);
            this._woeid = this._settings.get_string(WEATHER_WOEID_KEY);
            this._translate_condition = this._settings.get_boolean(WEATHER_TRANSLATE_CONDITION_KEY);
            this._icon_type = this._settings.get_boolean(WEATHER_USE_SYMBOLIC_ICONS_KEY) ? St.IconType.SYMBOLIC : St.IconType.FULLCOLOR;
            this._comment_in_panel = this._settings.get_boolean(WEATHER_SHOW_COMMENT_IN_PANEL_KEY);
            this.refreshWeather(false);
        });
        this._settings.connect('changed::' + WEATHER_UNIT_KEY, load_settings_and_refresh_weather);
        this._settings.connect('changed::' + WEATHER_CITY_KEY, load_settings_and_refresh_weather);
        this._settings.connect('changed::' + WEATHER_WOEID_KEY, load_settings_and_refresh_weather);
        this._settings.connect('changed::' + WEATHER_TRANSLATE_CONDITION_KEY, load_settings_and_refresh_weather);
        this._settings.connect('changed::' + WEATHER_SHOW_COMMENT_IN_PANEL_KEY, load_settings_and_refresh_weather);
        this._settings.connect('changed::' + WEATHER_USE_SYMBOLIC_ICONS_KEY, Lang.bind(this, function() {
            this._icon_type = this._settings.get_boolean(WEATHER_USE_SYMBOLIC_ICONS_KEY) ? St.IconType.SYMBOLIC : St.IconType.FULLCOLOR;
            this._weatherIcon.icon_type = this._icon_type;
            this._currentWeatherIcon.icon_type = this._icon_type;
            this._forecast[0].Icon.icon_type = this._icon_type;
            this._forecast[1].Icon.icon_type = this._icon_type;
            this.refreshWeather(false);
        }));
        
        // Panel icon
        this._weatherIcon = new St.Icon({
            icon_type: this._icon_type,
            icon_size: Main.panel.button.get_child().height,
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
        if (this._text_in_panel)
            topBox.add_actor(this._weatherInfo);
        this.actor.set_child(topBox);
        
        switch (this._position_in_panel) {
            case WeatherPosition.CENTER: 
                Main.panel._centerBox.add(this.actor, { y_fill: true });
                break;
            case WeatherPosition.RIGHT:
                let children = Main.panel._rightBox.get_children();
                Main.panel._rightBox.insert_actor(this.actor, children.length-1);
                break;
        }
        
        Main.panel._menus.addMenu(this.menu);
        
        // Current weather
        this._currentWeather = new St.Bin({ style_class: 'current' });
        // Future weather
        this._futureWeather = new St.Bin({ style_class: 'forecast' /*, x_align: St.Align.START*/});
        
        // Separator (copied from Gnome shell's popupMenu.js)
        this._separatorArea = new St.DrawingArea({ style_class: 'popup-separator-menu-item' });
        this._separatorArea.width = 200;
        this._separatorArea.connect('repaint', Lang.bind(this, this._onSeparatorAreaRepaint));
        
        // Putting the popup item together
        let mainBox = new St.BoxLayout({ vertical: true });
        mainBox.add_actor(this._currentWeather);
        mainBox.add_actor(this._separatorArea);
        mainBox.add_actor(this._futureWeather);
        
        this.menu.addActor(mainBox);

        /* TODO install script via Makefile
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        let item = new PopupMenu.PopupMenuItem(_("Preferences..."));
        item.connect('activate', function() {
            Util.spawn(["weather-extension-configurator"]);
        });
        this.menu.addMenuItem(item);
        */
        
        // Items
        this.showLoadingUi();
        
        this.rebuildCurrentWeatherUi();
        this.rebuildFutureWeatherUi();
        
        // Show weather
        Mainloop.timeout_add_seconds(3, Lang.bind(this, function() {
            this.refreshWeather(true);
        }));
        
    },

    unit_to_url: function() {
        return this._units == WeatherUnits.FAHRENHEIT ? 'f' : 'c';
    },

    unit_to_unicode: function() {
        return this._units == WeatherUnits.FAHRENHEIT ? '\u2109' : '\u2103';
    },

    get_weather_url: function() {
        return 'http://weather.yahooapis.com/forecastjson?u=' + this.unit_to_url() + '&p=' + this._woeid;
    },

    get_forecast_url: function() {
        return 'http://query.yahooapis.com/v1/public/yql?format=json&q=select%20item.forecast%20from%20weather.forecast%20where%20location%3D%22' + this._woeid + '%22%20%20and%20u="' + this.unit_to_url() + '"';
    },

    get_weather_icon: function(code) {
        /* see http://developer.yahoo.com/weather/#codetable */
        /* fallback icons are: weather-clear-night weather-clear weather-few-clouds-night weather-few-clouds weather-fog weather-overcast weather-severe-alert weather-showers weather-showers-scattered weather-snow weather-storm */
        switch (parseInt(code, 10)) {
            case 0:/* tornado */
                return ['weather-severe-alert'];
            case 1:/* tropical storm */
                return ['weather-severe-alert'];
            case 2:/* hurricane */
                return ['weather-severe-alert'];
            case 3:/* severe thunderstorms */
                return ['weather-severe-alert'];
            case 4:/* thunderstorms */
                return ['weather-storm'];
            case 5:/* mixed rain and snow */
                return ['weather-snow-rain', 'weather-snow'];
            case 6:/* mixed rain and sleet */
                return ['weather-snow-rain', 'weather-snow'];
            case 7:/* mixed snow and sleet */
                return ['weather-snow'];
            case 8:/* freezing drizzle */
                return ['weather-freezing-rain', 'weather-showers'];
            case 9:/* drizzle */
                return ['weather-fog'];
            case 10:/* freezing rain */
                return ['weather-freezing-rain', 'weather-showers'];
            case 11:/* showers */
                return ['weather-showers'];
            case 12:/* showers */
                return ['weather-showers'];
            case 13:/* snow flurries */
                return ['weather-snow'];
            case 14:/* light snow showers */
                return ['weather-snow'];
            case 15:/* blowing snow */
                return ['weather-snow'];
            case 16:/* snow */
                return ['weather-snow'];
            case 17:/* hail */
                return ['weather-snow'];
            case 18:/* sleet */
                return ['weather-snow'];
            case 19:/* dust */
                return ['weather-fog'];
            case 20:/* foggy */
                return ['weather-fog'];
            case 21:/* haze */
                return ['weather-fog'];
            case 22:/* smoky */
                return ['weather-fog'];
            case 23:/* blustery */
                return ['weather-few-clouds'];
            case 24:/* windy */
                return ['weather-few-clouds'];
            case 25:/* cold */
                return ['weather-few-clouds'];
            case 26:/* cloudy */
                return ['weather-overcast'];
            case 27:/* mostly cloudy (night) */
                return ['weather-clouds-night', 'weather-few-clouds-night'];
            case 28:/* mostly cloudy (day) */
                return ['weather-clouds', 'weather-overcast'];
            case 29:/* partly cloudy (night) */
                return ['weather-few-clouds-night'];
            case 30:/* partly cloudy (day) */
                return ['weather-few-clouds'];
            case 31:/* clear (night) */
                return ['weather-clear-night'];
            case 32:/* sunny */
                return ['weather-clear'];
            case 33:/* fair (night) */
                return ['weather-clear-night'];
            case 34:/* fair (day) */
                return ['weather-clear'];
            case 35:/* mixed rain and hail */
                return ['weather-snow-rain', 'weather-showers'];
            case 36:/* hot */
                return ['weather-clear'];
            case 37:/* isolated thunderstorms */
                return ['weather-storm'];
            case 38:/* scattered thunderstorms */
            case 39:/* scattered thunderstorms */
                return ['weather-storm'];
            case 40:/* scattered showers */
                return ['weather-showers-scattered', 'weather-showers'];
            case 41:/* heavy snow */
                return ['weather-snow'];
            case 42:/* scattered snow showers */
                return ['weather-snow'];
            case 43:/* heavy snow */
                return ['weather-snow'];
            case 44:/* partly cloudy */
                return ['weather-few-clouds'];
            case 45:/* thundershowers */
                return ['weather-storm'];
            case 46:/* snow showers */
                return ['weather-snow'];
            case 47:/* isolated thundershowers */
                return ['weather-storm'];
            case 3200:/* not available */
            default:
                return ['weather-severe-alert'];
        }
    },

    get_weather_icon_safely: function(code) {
        let iconname = this.get_weather_icon(code);
        for (let i = 0; i < iconname.length; i++) {
            if (this.has_icon(iconname[i]))
                return iconname[i];
        }
        return 'weather-severe-alert';
     },

    has_icon: function(icon) {
        //TODO correct symbolic name? (cf. symbolic_names_for_icon)
        return Gtk.IconTheme.get_default().has_icon(icon + (this._icon_type == St.IconType.SYMBOLIC ? '-symbolic' : ''));
    },

    get_weather_condition: function(code) {
        switch (parseInt(code, 10)){
            case 0:/* tornado */
                return _('Tornado');
            case 1:/* tropical storm */
                return _('Tropical storm');
            case 2:/* hurricane */
                return _('Hurricane');
            case 3:/* severe thunderstorms */
                return _('Severe thunderstorms');
            case 4:/* thunderstorms */
                return _('Thunderstorms');
            case 5:/* mixed rain and snow */
                return _('Mixed rain and snow');
            case 6:/* mixed rain and sleet */
                return _('Mixed rain and sleet');
            case 7:/* mixed snow and sleet */
                return _('Mixed snow and sleet');
            case 8:/* freezing drizzle */
                return _('Freezing drizzle');
            case 9:/* drizzle */
                return _('Drizzle');
            case 10:/* freezing rain */
                return _('Freezing rain');
            case 11:/* showers */
                return _('Showers');
            case 12:/* showers */
                return _('Showers');
            case 13:/* snow flurries */
                return _('Snow flurries');
            case 14:/* light snow showers */
                return _('Light snow showers');
            case 15:/* blowing snow */
                return _('Blowing snow');
            case 16:/* snow */
                return _('Snow');
            case 17:/* hail */
                return _('Hail');
            case 18:/* sleet */
                return _('Sleet');
            case 19:/* dust */
                return _('Dust');
            case 20:/* foggy */
                return _('Foggy');
            case 21:/* haze */
                return _('Haze');
            case 22:/* smoky */
                return _('Smoky');
            case 23:/* blustery */
                return _('Blustery');
            case 24:/* windy */
                return _('Windy');
            case 25:/* cold */
                return _('Cold');
            case 26:/* cloudy */
                return _('Cloudy');
            case 27:/* mostly cloudy (night) */
            case 28:/* mostly cloudy (day) */
                return _('Mostly cloudy');
            case 29:/* partly cloudy (night) */
            case 30:/* partly cloudy (day) */
                return _('Partly cloudy');
            case 31:/* clear (night) */
                return _('Clear');
            case 32:/* sunny */
                return _('Sunny');
            case 33:/* fair (night) */
            case 34:/* fair (day) */
                return _('Fair');
            case 35:/* mixed rain and hail */
                return _('Mixed rain and hail');
            case 36:/* hot */
                return _('Hot');
            case 37:/* isolated thunderstorms */
                return _('Isolated thunderstorms');
            case 38:/* scattered thunderstorms */
            case 39:/* scattered thunderstorms */
                return _('Scattered thunderstorms');
            case 40:/* scattered showers */
                return _('Scattered showers');
            case 41:/* heavy snow */
                return _('Heavy snow');
            case 42:/* scattered snow showers */
                return _('Scattered snow showers');
            case 43:/* heavy snow */
                return _('Heavy snow');
            case 44:/* partly cloudy */
                return _('Partly cloudy');
            case 45:/* thundershowers */
                return _('Thundershowers');
            case 46:/* snow showers */
                return _('Snow showers');
            case 47:/* isolated thundershowers */
                return _('Isolated thundershowers');
            case 3200:/* not available */
            default:
                return _('Not available');
        }
    },

    parse_day: function(abr) {
        let yahoo_days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        for (var i = 0; i < yahoo_days.length; i++) {
            if (yahoo_days[i].substr(0, abr.length) == abr.toLowerCase()) {
                return i;
            }
        }
        return 0;    
    },

    get_locale_day: function(abr) {
        let days = [_('Monday'), _('Tuesday'), _('Wednesday'), _('Thursday'), _('Friday'), _('Saturday'), _('Sunday')];
        return days[this.parse_day(abr)];
    },

    load_json_async: function(url, fun) {
        let here = this;
        let session = new Soup.SessionAsync();
        let message = Soup.Message.new('GET', url);
        session.queue_message(message, function(session, message) {
            let jp = new Json.Parser();
            jp.load_from_data(message.response_body.data, -1);
            fun.call(here, jp.get_root().get_object());
        });
    },

    refreshWeather: function(recurse) {
        // Refresh current weather
        this.load_json_async(this.get_weather_url(), function(weather) {
        
            // Fixes wrong woeid if necessary
            try {
                // Wrong woeid specified
                if (weather.has_member('code') && weather.get_int_member('code') == 500) {
                    // Fetch correct woeid
                    this.load_json_async(this.get_weather_url().replace('p=', 'w='), function(weather) {
                        try {
                            // Take correct woeid, update gsettings
                            this._woeid = weather.get_object_member('location').get_string_member('location_id');
                            this._settings.set_string(WEATHER_WOEID_KEY, this._woeid);
                            // Load weather with correct woeid
                            this.refreshWeather(false);
                        } catch(e) {
                        }
                    });
                    return;
                }
            } catch(e) {
                global.log('A ' + e.name + ' has occured: ' + e.message);
            }
            
            let location = weather.get_object_member('location').get_string_member('city');
            if (this._city != null && this._city.length > 0)
                location = this._city;
            
            let comment = weather.get_object_member('condition').get_string_member('text');
            if (this._translate_condition)
                comment = this.get_weather_condition(weather.get_object_member('condition').get_string_member('code'));
            
            let temperature = weather.get_object_member('condition').get_double_member('temperature');
            let humidity = weather.get_object_member('atmosphere').get_string_member('humidity') + ' %';
            let pressure = weather.get_object_member('atmosphere').get_double_member('pressure');
            let pressure_unit = weather.get_object_member('units').get_string_member('pressure');
            let wind_direction = weather.get_object_member('wind').get_string_member('direction');
            let wind = weather.get_object_member('wind').get_double_member('speed');
            let wind_unit = weather.get_object_member('units').get_string_member('speed');
            let iconname = this.get_weather_icon_safely(weather.get_object_member('condition').get_string_member('code'));
            
            this._currentWeatherIcon.icon_name = this._weatherIcon.icon_name = iconname;

            if(this._comment_in_panel)
                this._weatherInfo.text = (comment + ' ' + temperature + ' ' + this.unit_to_unicode());
            else
                this._weatherInfo.text = (temperature + ' ' + this.unit_to_unicode());


            
            this._currentWeatherSummary.text = comment;
            this._currentWeatherLocation.text = location;
            this._currentWeatherTemperature.text = temperature + ' ' + this.unit_to_unicode();
            this._currentWeatherHumidity.text = humidity;
            this._currentWeatherPressure.text = pressure + ' ' + pressure_unit;
            this._currentWeatherWind.text = (wind_direction ? wind_direction + ' ' : '') + wind + ' ' + wind_unit;
            
        });
        
        // Refresh forecast
        this.load_json_async(this.get_forecast_url(), function(forecast) {
            
            let date_string = [_('Today'), _('Tomorrow')];
            forecast = forecast.get_object_member('query').get_object_member('results').get_array_member('channel').get_elements();
            for (let i = 0; i <= 1; i++) {
                let forecastUi = this._forecast[i];
                let forecastData = forecast[i].get_object().get_object_member('item').get_object_member('forecast');
                
                let code = forecastData.get_string_member('code');
                let t_low = forecastData.get_string_member('low');
                let t_high = forecastData.get_string_member('high');
                
                let comment = forecastData.get_string_member('text');
                if (this._translate_condition)
                    comment = this.get_weather_condition(code);
                
                forecastUi.Day.text = date_string[i] + ' (' + this.get_locale_day(forecastData.get_string_member('day')) + ')';
                forecastUi.Temperature.text = t_low + '\u2013' + t_high + ' ' + this.unit_to_unicode();
                forecastUi.Summary.text = comment;
                forecastUi.Icon.icon_name = this.get_weather_icon_safely(code);
            }
        
        });
        
        // Repeatedly refresh weather if recurse is set
        if (recurse) {
            Mainloop.timeout_add_seconds(60 * 4, Lang.bind(this, function() {
                this.refreshWeather(true);
            }));
        }
        
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
            icon_type: this._icon_type,
            icon_size: 64,
            icon_name: 'view-refresh-symbolic',
            style_class: 'weather-current-icon'
        });
        
        // The summary of the current weather
        this._currentWeatherSummary = new St.Label({
            text: _('Loading ...'),
            style_class: 'weather-current-summary'
        });
        this._currentWeatherLocation = new St.Label({ text: _('Please wait') });
        
        let bb = new St.BoxLayout({
            vertical: true,
            style_class: 'weather-current-summarybox'
        });
        bb.add_actor(this._currentWeatherLocation);
        bb.add_actor(this._currentWeatherSummary);
        
        // Other labels
        this._currentWeatherTemperature = new St.Label({ text: '...' });
        this._currentWeatherHumidity = new St.Label({ text:  '...' });
        this._currentWeatherPressure = new St.Label({ text: '...' });
        this._currentWeatherWind = new St.Label({ text: '...' });
        
        let rb = new St.BoxLayout({
            style_class: 'weather-current-databox'
        });
        let rb_captions = new St.BoxLayout({
            vertical: true,
            style_class: 'weather-current-databox-captions'
        });
        let rb_values = new St.BoxLayout({
            vertical: true,
            style_class: 'weather-current-databox-values'
        });
        rb.add_actor(rb_captions);
        rb.add_actor(rb_values);
        
        rb_captions.add_actor(new St.Label({text: _('Temperature:')}));
        rb_values.add_actor(this._currentWeatherTemperature);
        rb_captions.add_actor(new St.Label({text: _('Humidity:')}));
        rb_values.add_actor(this._currentWeatherHumidity);
        rb_captions.add_actor(new St.Label({text: _('Pressure:')}));
        rb_values.add_actor(this._currentWeatherPressure);
        rb_captions.add_actor(new St.Label({text: _('Wind:')}));
        rb_values.add_actor(this._currentWeatherWind);
        
        let xb = new St.BoxLayout();
        xb.add_actor(bb);
        xb.add_actor(rb);
        
        let box = new St.BoxLayout({
            style_class: 'weather-current-iconbox'
        });
        box.add_actor(this._currentWeatherIcon);
        box.add_actor(xb);
        this._currentWeather.set_child(box);
        
    },

    rebuildFutureWeatherUi: function() {
        this.destroyFutureWeather();
        
        this._forecast = [];
        this._forecastBox = new St.BoxLayout();
        this._futureWeather.set_child(this._forecastBox);
        
        for (let i = 0; i <= 1; i++) {
            let forecastWeather = {};
            
            forecastWeather.Icon = new St.Icon({
                icon_type: this._icon_type,
                icon_size: 48,
                icon_name: 'view-refresh-symbolic',
                style_class: 'weather-forecast-icon'
            });
            forecastWeather.Day = new St.Label({
                style_class: 'weather-forecast-day'
            });
            forecastWeather.Summary = new St.Label({
                style_class: 'weather-forecast-summary'
            });
            forecastWeather.Temperature = new St.Label({
                style_class: 'weather-forecast-temperature'
            });
            
            let by = new St.BoxLayout({
                vertical: true,
                style_class: 'weather-forecast-databox'
            });
            by.add_actor(forecastWeather.Day);
            by.add_actor(forecastWeather.Summary);
            by.add_actor(forecastWeather.Temperature);
            
            let bb = new St.BoxLayout({
                style_class: 'weather-forecast-box'
            });
            bb.add_actor(forecastWeather.Icon);
            bb.add_actor(by);
            
            this._forecast[i] = forecastWeather;
            this._forecastBox.add_actor(bb);
        
        }
        
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
}

// vim:set ts=4 sw=4 et:
