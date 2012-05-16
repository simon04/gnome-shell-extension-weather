/*
 *
 *  Weather extension for GNOME Shell
 *  - Displays a small weather information on the top panel.
 *  - On click, gives a popup with details about the weather.
 *
 * Copyright (C) 2011 - 2012
 *     ecyrbe <ecyrbe+spam@gmail.com>,
 *     Timur Kristof <venemo@msn.com>,
 *     Elad Alfassa <elad@fedoraproject.org>,
 *     Simon Legner <Simon.Legner@gmail.com>,
 *     Christian METZLER <neroth@xeked.com>,
 *     Mark Benjamin weather.gnome.Markie1@dfgh.net
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
const Clutter = imports.gi.Clutter;
const Gettext = imports.gettext.domain('gnome-shell-extension-weather');
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Soup = imports.gi.Soup;
const Shell = imports.gi.Shell;
const St = imports.gi.St;
const Util = imports.misc.util;
const _ = Gettext.gettext;

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

// Settings
const WEATHER_SETTINGS_SCHEMA = 'org.gnome.shell.extensions.weather';
const WEATHER_UNIT_KEY = 'unit';
const WEATHER_WIND_SPEED_UNIT_KEY = 'wind-speed-unit';
const WEATHER_CITY_KEY = 'city';
const WEATHER_ACTUAL_CITY_KEY = 'actual-city';
const WEATHER_TRANSLATE_CONDITION_KEY = 'translate-condition';
const WEATHER_USE_SYMBOLIC_ICONS_KEY = 'use-symbolic-icons';
const WEATHER_SHOW_TEXT_IN_PANEL_KEY = 'show-text-in-panel';
const WEATHER_POSITION_IN_PANEL_KEY = 'position-in-panel';
const WEATHER_SHOW_COMMENT_IN_PANEL_KEY = 'show-comment-in-panel';
const WEATHER_REFRESH_INTERVAL = 'refresh-interval';

// Keep enums in sync with GSettings schemas
const WeatherUnits = {
    CELSIUS: 0,
    FAHRENHEIT: 1
}

const WeatherWindSpeedUnits = {
	KPH: 0,
	MPH: 1,
	MPS: 2,
	KNOTS: 3
}

const WeatherPosition = {
    CENTER: 0,
    RIGHT: 1,
    LEFT: 2
}

const WEATHER_CONV_MPH_IN_MPS = 2.23693629;
const WEATHER_CONV_KPH_IN_MPS = 3.6;
const WEATHER_CONV_KNOTS_IN_MPS = 1.94384449;

// Soup session (see https://bugzilla.gnome.org/show_bug.cgi?id=661323#c64) (Simon Legner)
const _httpSession = new Soup.SessionAsync();
Soup.Session.prototype.add_feature.call(_httpSession, new Soup.ProxyResolverDefault());

function WeatherMenuButton() {
    this._init();
}

WeatherMenuButton.prototype = {
	__proto__: PanelMenu.Button.prototype,

	_init: function() {
	// Load settings
	this.loadConfig();

	// Label
	this._weatherInfo = new St.Label({ text: _('...') });

	if(typeof St.TextDirection == "undefined")
	{
		// Panel icon
		this._weatherIcon = new St.Icon({
		    icon_type: this._icon_type,
		    icon_name: 'view-refresh-symbolic',
		    style_class: 'system-status-icon weather-icon' + (Main.panel.actor.get_text_direction() == Clutter.TextDirection.RTL ? '-rtl' : '')
		});

		// Panel menu item - the current class
		let menuAlignment = 0.25;
		if (Clutter.get_default_text_direction() == Clutter.TextDirection.RTL)
		    menuAlignment = 1.0 - menuAlignment;
		PanelMenu.Button.prototype._init.call(this, menuAlignment);
	}
	else
	{
		// Panel icon
		this._weatherIcon = new St.Icon({
		    icon_type: this._icon_type,
		    icon_name: 'view-refresh-symbolic',
		    style_class: 'system-status-icon weather-icon' + (Main.panel.actor.get_direction() == St.TextDirection.RTL ? '-rtl' : '')
		});

		// Panel menu item - the current class
		let menuAlignment = 0.25;
		if (St.Widget.get_default_direction() == St.TextDirection.RTL)
		    menuAlignment = 1.0 - menuAlignment;
		PanelMenu.Button.prototype._init.call(this, menuAlignment);
	}

	var schemaInterface = "org.gnome.desktop.interface";
	 	if (Gio.Settings.list_schemas().indexOf(schemaInterface) == -1)
		throw _("Schema \"%s\" not found.").replace("%s",schemaInterface);
   	var settingsInterface = new Gio.Settings({ schema: schemaInterface });
	this._clockFormat = settingsInterface.get_string("clock-format");

	// Putting the panel item together
	let topBox = new St.BoxLayout();
	topBox.add_actor(this._weatherIcon);
	topBox.add_actor(this._weatherInfo);
	this.actor.add_actor(topBox);

	let children = null;
	switch (this._position_in_panel) {
	    case WeatherPosition.LEFT:
		children = Main.panel._leftBox.get_children();
		Main.panel._leftBox.add(this.actor, children.length-1);
		break;
	    case WeatherPosition.CENTER:
		Main.panel._centerBox.add(this.actor, { y_fill: true });
		break;
	    case WeatherPosition.RIGHT:
		children = Main.panel._rightBox.get_children();
		Main.panel._rightBox.insert_child_at_index(this.actor, 0);
		break;
	}

	Main.panel._menus.addMenu(this.menu);

	// Current weather
	this._currentWeather = new St.Bin({ style_class: 'current' });
	// Future weather
	this._futureWeather = new St.Bin({ style_class: 'forecast'});

	// Putting the popup item together
	this.menu.addActor(this._currentWeather);

	let item = new PopupMenu.PopupSeparatorMenuItem();
	this.menu.addMenuItem(item);

	this.menu.addActor(this._futureWeather);

	let item = new PopupMenu.PopupSeparatorMenuItem();
	this.menu.addMenuItem(item);

	let item = new PopupMenu.PopupMenuItem(_("Reload Weather Information"));
	item.connect('activate', Lang.bind(this, function(){this.refreshWeather(false);}));
	this.menu.addMenuItem(item);

	let item = new PopupMenu.PopupMenuItem(_("Weather Settings"));
	item.connect('activate', Lang.bind(this, this._onPreferencesActivate));
	this.menu.addMenuItem(item);

	// Items
	this.showLoadingUi();

	this.rebuildCurrentWeatherUi();
	this.rebuildFutureWeatherUi();

	// Show weather
	this.refreshWeather(true);

	},

	loadConfig : function()
	{
	var that = this;
	var schema = WEATHER_SETTINGS_SCHEMA;
	 	if (Gio.Settings.list_schemas().indexOf(schema) == -1)
		throw _("Schema \"%s\" not found.").replace("%s",schema);
   	this._settings = new Gio.Settings({ schema: schema });
	this._settings.connect("changed",function(){that.refreshWeather(false);});
	},

	get _units()
	{
		if(!this._settings)
		this.loadConfig();
	return this._settings.get_enum(WEATHER_UNIT_KEY);
	},

	set _units(v)
	{
		if(!this._settings)
		this.loadConfig();
	this._settings.set_enum(WEATHER_UNIT_KEY,v);
	},

	get _wind_speed_units()
	{
		if(!this._settings)
		this.loadConfig();
	return this._settings.get_enum(WEATHER_WIND_SPEED_UNIT_KEY);
	},

	set _wind_speed_units(v)
	{
		if(!this._settings)
		this.loadConfig();
	this._settings.set_enum(WEATHER_WIND_SPEED_UNIT_KEY,v);
	},

	get _cities()
	{
		if(!this._settings)
		this.loadConfig();
	return this._settings.get_string(WEATHER_CITY_KEY);
	},

	set _cities(v)
	{
		if(!this._settings)
		this.loadConfig();
	this._settings.set_string(WEATHER_CITY_KEY,v);
	},

	get _actual_city()
	{
		if(!this._settings)
		this.loadConfig();
	var a = this._settings.get_int(WEATHER_ACTUAL_CITY_KEY);
	var b = a;
	var cities = this._cities.split(" && ");

		if(typeof cities != "object")
		cities = [cities];

	var l = cities.length-1;

		if(a < 0)
		a = 0;

		if(l < 0)
		l = 0;

		if(a > l)
		a = l;

	return a;
	},

	set _actual_city(a)
	{
		if(!this._settings)
		this.loadConfig();
	var cities = this._cities.split(" && ");

		if(typeof cities != "object")
		cities = [cities];

	var l = cities.length-1;

		if(a < 0)
		a = 0;

		if(l < 0)
		l = 0;

		if(a > l)
		a = l;

	this._settings.set_int(WEATHER_ACTUAL_CITY_KEY,a);
	},

	get _city()
	{
	let cities = this._cities;
	let cities = cities.split(" && ");
		if(cities && typeof cities == "string")
		cities = [cities];
		if(!cities[0])
		return "";
	cities = cities[this._actual_city];
	return cities;
	},

	set _city(v)
	{
	let cities = this._cities;
	cities = cities.split(" && ");
		if(cities && typeof cities == "string")
		cities = [cities];
		if(!cities[0])
		cities = [];
	cities.splice(this.actual_city,1,v);
	cities = cities.join(" && ");
		if(typeof cities != "string")
		cities = cities[0];
	this._cities = cities;
	},

	get _translate_condition()
	{
		if(!this._settings)
		this.loadConfig();
	return this._settings.get_boolean(WEATHER_TRANSLATE_CONDITION_KEY);
	},

	set _translate_condition(v)
	{
		if(!this._settings)
		this.loadConfig();
	this._settings.set_boolean(WEATHER_TRANSLATE_CONDITION_KEY,v);
	},

	get _icon_type()
	{
		if(!this._settings)
		this.loadConfig();
	return this._settings.get_boolean(WEATHER_USE_SYMBOLIC_ICONS_KEY) ? St.IconType.SYMBOLIC : St.IconType.FULLCOLOR;
	},

	set _icon_type(v)
	{
		if(!this._settings)
		this.loadConfig();
	this._settings.set_boolean(WEATHER_USE_SYMBOLIC_ICONS_KEY,v == St.IconType.SYMBOLIC ? 1 : 0);
	},

	get _text_in_panel()
	{
		if(!this._settings)
		this.loadConfig();
	return this._settings.get_boolean(WEATHER_SHOW_TEXT_IN_PANEL_KEY);
	},

	set _text_in_panel(v)
	{
		if(!this._settings)
		this.loadConfig();
	this._settings.set_boolean(WEATHER_SHOW_TEXT_IN_PANEL_KEY,v);
	},

	get _position_in_panel()
	{
		if(!this._settings)
		this.loadConfig();
	return this._settings.get_enum(WEATHER_POSITION_IN_PANEL_KEY);
	},

	set _position_in_panel(v)
	{
		if(!this._settings)
		this.loadConfig();
	this._settings.set_enum(WEATHER_POSITION_IN_PANEL_KEY,v);
	},

	get _comment_in_panel()
	{
		if(!this._settings)
		this.loadConfig();
	return this._settings.get_boolean(WEATHER_SHOW_COMMENT_IN_PANEL_KEY);
	},

	set _comment_in_panel(v)
	{
		if(!this._settings)
		this.loadConfig();
	this._settings.set_boolean(WEATHER_SHOW_COMMENT_IN_PANEL_KEY,v);
	},

	get _refresh_interval()
	{
		if(!this._settings)
		this.loadConfig();
	return this._settings.get_int(WEATHER_REFRESH_INTERVAL);
	},

	set _refresh_interval(v)
	{
		if(!this._settings)
		this.loadConfig();
	this._settings.set_int(WEATHER_REFRESH_INTERVAL,v);
	},

	extractLocation : function()
	{
		if(arguments[0].search(">") == -1)
		return _("Invalid city");
	return arguments[0].split(">")[1];
	},

	extractWoeid : function()
	{
		if(arguments[0].search(">") == -1)
		return 0;
	return arguments[0].split(">")[0];
	},

	updateCities : function()
	{
	let that = this;
	let cities = this._cities;
	cities = cities.split(" && ");
		if(cities && typeof cities == "string")
		cities = [cities];
		if(!cities[0])
		cities = [];

		for(let a in cities)
		{
			if(!this.extractWoeid(cities[a]))
			{
				this.load_json_async(encodeURI("http://query.yahooapis.com/v1/public/yql?format=json&q=select woeid,name,admin1,country from geo.places where text = '"+cities[a]+"' limit 1"),function()
				{
				let city = arguments[0].query;
					if(typeof city == "object" && typeof city.results == "object")
					city = city.results.place;
					else
					return 0;
				let cityText = city.woeid+">"+city.name+", "+city.admin1.content+", "+city.country.code;
				cities.splice(a,1,cityText);
				cities = cities.join(" && ");
					if(typeof cities != "string")
					cities = cities[0];
				that._cities = cities;
				that.updateCities();
				});
			return 0;
			}
			else
			continue;
		}
	this.refreshWeather();
	},

    _onPreferencesActivate : function() {
    let app = Shell.AppSystem.get_default().lookup_app('weather-settings.desktop');
    app.activate();
    },

    unit_to_url: function() {
        return this._units == WeatherUnits.FAHRENHEIT ? 'f' : 'c';
    },

    unit_to_unicode: function() {
        return this._units == WeatherUnits.FAHRENHEIT ? '\u2109' : '\u2103';
    },

    get_weather_url: function() {
        return encodeURI('http://query.yahooapis.com/v1/public/yql?format=json&q=select * from weather.forecast where woeid = '+this.extractWoeid(this._city)+' and u="' + this.unit_to_url() + '"');
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
                return ['weather-storm'];
            case 39:/* http://developer.yahoo.com/forum/YDN-Documentation/Yahoo-Weather-API-Wrong-Condition-Code/1290534174000-1122fc3d-da6d-34a2-9fb9-d0863e6c5bc6 */
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

    get_compass_direction: function(deg) {
        let directions = ["\u2191", "\u2197", "\u2192", "\u2198", "\u2193", "\u2199", "\u2190", "\u2196"];
        return directions[Math.round(deg / 45) % directions.length];
    },

    get_pressure_state: function(state) {
      switch (parseInt(state, 3)) {
      case 0:
        return '';
      case 1:
        return '\u2934';
      case 2:
        return '\u2935';
      }
    },

    load_json_async: function(url, fun) {
        let here = this;

        let message = Soup.Message.new('GET', url);

        _httpSession.queue_message(message, function(_httpSession, message) {
            if(!message.response_body.data)
            {
            fun.call(here,0);
            return 0;
            }

            try
            {
            let jp = JSON.parse(message.response_body.data);
            fun.call(here, jp);
            }
            catch(e)
            {
            fun.call(here,0);
            return 0;
            }
        });
    },

    refreshWeather: function(recurse) {
        if(!this.extractWoeid(this._city))
	{
	this.updateCities();
        return 0;
	}
        this.load_json_async(this.get_weather_url(), function(json) {
                if(!json)
                return 0;
            let weather = json.query.results.channel;
            let many = 0;
                if(typeof weather[0] != "undefined")
                {
                weather = weather[0];
                many = 1;
                }
            let weather_c = weather.item.condition;

		this._weatherIcon.icon_type = this._icon_type;
		this._currentWeatherIcon.icon_type = this._icon_type;
		this._forecast[0].Icon.icon_type = this._icon_type;
		this._forecast[1].Icon.icon_type = this._icon_type;
		this._sunriseIcon.icon_type = this._icon_type;
		this._sunsetIcon.icon_type = this._icon_type;

            let forecast = weather.item.forecast;
            let location = this.extractLocation(this._city);

            // Refresh current weather
            let comment = weather_c.text;
            if (this._translate_condition)
                comment = this.get_weather_condition(weather_c.code);

            let temperature = weather_c.temp;
            let chill = weather.wind.chill;
            let humidity = weather.atmosphere.humidity + ' %';
            let pressure = weather.atmosphere.pressure;
            let pressure_unit = weather.units.pressure;
	    let pressure_state = weather.atmosphere.rising;
            let wind_direction = this.get_compass_direction(weather.wind.direction);
            let wind = weather.wind.speed;
            let wind_unit = weather.units.speed;
            let iconname = this.get_weather_icon_safely(weather_c.code);
            let sunrise = weather.astronomy.sunrise;
            let sunset = weather.astronomy.sunset;

		if(this._clockFormat == "24h")
		{
		sunrise = new Date("3 Mar 1999 "+sunrise);
		sunrise = sunrise.getHours()+":"+((sunrise.getMinutes()<10)?"0":"")+sunrise.getMinutes();
		sunset = new Date("3 Mar 1999 "+sunset);
		sunset = sunset.getHours()+":"+((sunset.getMinutes()<10)?"0":"")+sunset.getMinutes();
		}

            this._currentWeatherIcon.icon_name = this._weatherIcon.icon_name = iconname;

	    let weatherInfoC = "";
	    let weatherInfoT = "";

		if (this._comment_in_panel)
		weatherInfoC = comment;

		if (this._text_in_panel)
		weatherInfoT = temperature + ' ' + this.unit_to_unicode();

	    this._weatherInfo.text = weatherInfoC + ((weatherInfoC)?" ":"") + weatherInfoT;

            this._currentWeatherSummary.text = comment + ", " + weather_c.temp + ' ' + this.unit_to_unicode();
            this._currentWeatherLocation.text = location;
            this._currentWeatherTemperature.text = chill + ' ' + this.unit_to_unicode();
            this._currentWeatherHumidity.text = humidity;
            this._currentWeatherPressure.text = pressure + ' ' + pressure_unit + ((pressure_state)?" ":"") + this.get_pressure_state(pressure_state);
	    this._currentWeatherSunrise.text = sunrise;
	    this._currentWeatherSunset.text = sunset;

            // Override wind units with our preference
            // Need to consider what units the Yahoo API has returned it in
            switch (this._wind_speed_units) {
                case WeatherWindSpeedUnits.KPH:
                    // Round to whole units
                    if (this._units == WeatherUnits.FAHRENHEIT) {
                        wind = Math.round (wind / WEATHER_CONV_MPH_IN_MPS * WEATHER_CONV_KPH_IN_MPS);
                        wind_unit = 'km/h';
                    }
                    // Otherwise no conversion needed - already in correct units
                    break;
                case WeatherWindSpeedUnits.MPH:
                    // Round to whole units
                    if (this._units == WeatherUnits.CELSIUS) {
                        wind = Math.round (wind / WEATHER_CONV_KPH_IN_MPS * WEATHER_CONV_MPH_IN_MPS);
                        wind_unit = 'mph';
                    }
                    // Otherwise no conversion needed - already in correct units
                    break;
                case WeatherWindSpeedUnits.MPS:
                    // Precision to one decimal place as 1 m/s is quite a large unit
                    if (this._units == WeatherUnits.CELSIUS)
                        wind = Math.round ((wind / WEATHER_CONV_KPH_IN_MPS) * 10)/ 10;
                    else
                        wind = Math.round ((wind / WEATHER_CONV_MPH_IN_MPS) * 10)/ 10;
                    wind_unit = 'm/s';
                    break;
                case WeatherWindSpeedUnits.KNOTS:
                    // Round to whole units
                    if (this._units == WeatherUnits.CELSIUS)
                        wind = Math.round (wind / WEATHER_CONV_KPH_IN_MPS * WEATHER_CONV_KNOTS_IN_MPS);
                    else
                        wind = Math.round (wind / WEATHER_CONV_MPH_IN_MPS * WEATHER_CONV_KNOTS_IN_MPS);
                    wind_unit = 'knots';
                    break;
            }
            if (!wind)
            	this._currentWeatherWind.text = '\u2013';
            else if (wind == 0 || !wind_direction)
            	this._currentWeatherWind.text = wind + ' ' + wind_unit;
            else // i.e. wind > 0 && wind_direction
            	this._currentWeatherWind.text = wind_direction + ' ' + wind + ' ' + wind_unit;

            // Refresh forecast
            let date_string = [_('Today'), _('Tomorrow')];
            for (let i = 0; i <= 1; i++) {
                let forecastUi = this._forecast[i];
                let forecastData = forecast[i];

                let code = forecastData.code;
                let t_low = forecastData.low;
                let t_high = forecastData.high;

                let comment = forecastData.text;
                if (this._translate_condition)
                    comment = this.get_weather_condition(code);

                forecastUi.Day.text = date_string[i] + ' (' + this.get_locale_day(forecastData.day) + ')';
                forecastUi.Temperature.text = t_low + '\u2013' + t_high + ' ' + this.unit_to_unicode();
                forecastUi.Summary.text = comment;
                forecastUi.Icon.icon_name = this.get_weather_icon_safely(code);
            }
        });

        // Repeatedly refresh weather if recurse is set
        if (recurse) {
            Mainloop.timeout_add_seconds(this._refresh_interval, Lang.bind(this, function() {
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
            icon_size: 72,
            icon_name: 'view-refresh-symbolic',
            style_class: 'weather-current-icon'
        });

	this._sunriseIcon = new St.Icon({
            icon_type: this._icon_type,
            icon_size: 15,
            icon_name: 'weather-clear',
            style_class: 'weather-sunrise-icon'
        });

	this._sunsetIcon = new St.Icon({
            icon_type: this._icon_type,
            icon_size: 15,
            icon_name: 'weather-clear-night',
            style_class: 'weather-sunset-icon'
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

	this._currentWeatherSunrise = new St.Label({ text: '-' });
	this._currentWeatherSunset = new St.Label({ text: '-' });

	let ab = new St.BoxLayout({	
	style_class: 'weather-current-astronomy'	
	});

	ab.add_actor(this._sunriseIcon);
	ab.add_actor(this._currentWeatherSunrise);
	ab.add_actor(this._sunsetIcon);	
	ab.add_actor(this._currentWeatherSunset);
	bb.add_actor(ab);

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

        rb_captions.add_actor(new St.Label({text: _('Feel like:')}));
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

    }
};

let weatherMenu;

function init() {
}

function enable() {
    weatherMenu = new WeatherMenuButton();
    Main.panel.addToStatusArea('weatherMenu', weatherMenu);
}

function disable() {
    weatherMenu.destroy();
}
