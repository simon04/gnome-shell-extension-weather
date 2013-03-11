/*
 *
 *  Weather extension for GNOME Shell
 *  - Displays a small weather information on the top panel.
 *  - On click, gives a popup with details about the weather.
 *
 * Copyright (C) 2011 - 2013
 *     ecyrbe <ecyrbe+spam@gmail.com>,
 *     Timur Kristof <venemo@msn.com>,
 *     Elad Alfassa <elad@fedoraproject.org>,
 *     Simon Legner <Simon.Legner@gmail.com>,
 *     Christian METZLER <neroth@xeked.com>,
 *     Mark Benjamin weather.gnome.Markie1@dfgh.net,
 *     Mattia Meneguzzo odysseus@fedoraproject.org,
 *     Meng Zhuo <mengzhuo1203+spam@gmail.com>
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

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
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
const WEATHER_WIND_DIRECTION_KEY = 'wind-direction';
const WEATHER_PRESSURE_UNIT_KEY = 'pressure-unit';
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
    FAHRENHEIT: 1,
    KELVIN: 2,
    RANKINE: 3,
    REAUMUR: 4,
    ROEMER: 5,
    DELISLE: 6,
    NEWTON: 7
}

const WeatherWindSpeedUnits = {
	KPH: 0,
	MPH: 1,
	MPS: 2,
	KNOTS: 3,
	FPS: 4,
	BEAUFORT: 5
}

const WeatherPressureUnits = {
	hPa: 0,
	inHg: 1,
	bar: 2,
	Pa: 3,
	kPa: 4,
	atm: 5,
	at: 6,
	Torr: 7,
	psi: 8
}

const WeatherPosition = {
    CENTER: 0,
    RIGHT: 1,
    LEFT: 2
}

const WEATHER_CONV_MPH_IN_MPS = 2.23693629;
const WEATHER_CONV_KPH_IN_MPS = 3.6;
const WEATHER_CONV_KNOTS_IN_MPS = 1.94384449;
const WEATHER_CONV_FPS_IN_MPS = 3.2808399;

// Soup session (see https://bugzilla.gnome.org/show_bug.cgi?id=661323#c64) (Simon Legner)
const _httpSession = new Soup.SessionAsync();
Soup.Session.prototype.add_feature.call(_httpSession, new Soup.ProxyResolverDefault());

const WeatherMenuButton = new Lang.Class({
	Name: 'WeatherMenuButton',

	Extends: PanelMenu.Button,

	_init: function() {
	// Load settings
	this.loadConfig();

	// Label
	this._weatherInfo = new St.Label({ text: _('...') });

	if(typeof St.TextDirection == "undefined")
	{
		// Panel icon
		this._weatherIcon = new St.Icon({
		    icon_name: 'view-refresh'+this.icon_type(),
		    style_class: 'system-status-icon weather-icon' + (Main.panel.actor.get_text_direction() == Clutter.TextDirection.RTL ? '-rtl' : '')
		});

		// Panel menu item - the current class
		let menuAlignment = 0.25;
		if (Clutter.get_default_text_direction() == Clutter.TextDirection.RTL)
		    menuAlignment = 1.0 - menuAlignment;
		this.parent(menuAlignment);
	}
	else
	{
		// Panel icon
		this._weatherIcon = new St.Icon({
		    icon_name: 'view-refresh'+this.icon_type(),
		    style_class: 'system-status-icon weather-icon' + (Main.panel.actor.get_direction() == St.TextDirection.RTL ? '-rtl' : '')
		});

		// Panel menu item - the current class
		let menuAlignment = 0.25;
		if (St.Widget.get_default_direction() == St.TextDirection.RTL)
		    menuAlignment = 1.0 - menuAlignment;
		PanelMenu.Button.prototype._init.call(this, menuAlignment);
	}

	// Putting the panel item together
	let topBox = new St.BoxLayout();
	topBox.add_actor(this._weatherIcon);
	topBox.add_actor(this._weatherInfo);
	this.actor.add_actor(topBox);

	let dummyBox = new St.BoxLayout();
	this.actor.reparent(dummyBox);
	dummyBox.remove_actor(this.actor);
	dummyBox.destroy();

	let children = null;
	switch (this._position_in_panel) {
	    case WeatherPosition.LEFT:
		children = Main.panel._leftBox.get_children();
		Main.panel._leftBox.insert_child_at_index(this.actor, children.length);
		break;
	    case WeatherPosition.CENTER:
		children = Main.panel._centerBox.get_children();
		Main.panel._centerBox.insert_child_at_index(this.actor, children.length);
		break;
	    case WeatherPosition.RIGHT:
		children = Main.panel._rightBox.get_children();
		Main.panel._rightBox.insert_child_at_index(this.actor, 0);
		break;
	}
		if(typeof Main.panel._menus == "undefined")
		Main.panel.menuManager.addMenu(this.menu);
		else
		Main.panel._menus.addMenu(this.menu);

	this._old_position_in_panel = this._position_in_panel;

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

	this._selectCity = new PopupMenu.PopupSubMenuMenuItem(_("Locations"));
	this.menu.addMenuItem(this._selectCity);
	this.rebuildSelectCityItem();

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

	stop : function()
	{
		if(this._timeoutS)
		Mainloop.source_remove(this._timeoutS);

		if(this._settingsC)
		{
		this._settings.disconnect(this._settingsC);
		this._settingsC = 0;
		}

		if(this._settingsInterfaceC)
		{
		this._settingsInterface.disconnect(this._settingsInterfaceC);
		this._settingsInterfaceC = 0;
		}
	},

	loadConfig : function()
	{
	let that = this;
   	this._settings = Convenience.getSettings(WEATHER_SETTINGS_SCHEMA);
	this._settingsC = this._settings.connect("changed",function(){that.refreshWeather(false);});
	},

	loadConfigInterface : function()
	{
	let that = this;
	let schemaInterface = "org.gnome.desktop.interface";
	 	if (Gio.Settings.list_schemas().indexOf(schemaInterface) == -1)
		throw _("Schema \"%s\" not found.").replace("%s",schemaInterface);
   	this._settingsInterface = new Gio.Settings({ schema: schemaInterface });
	this._settingsInterfaceC = this._settingsInterface.connect("changed",function(){that.refreshWeather(false);});
	},

	get _clockFormat()
	{
		if(!this._settingsInterface)
		this.loadConfigInterface();
	return this._settingsInterface.get_string("clock-format");
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

	get _wind_direction()
	{
		if(!this._settings)
		this.loadConfig();
	return this._settings.get_boolean(WEATHER_WIND_DIRECTION_KEY);
	},

	set _wind_direction(v)
	{
		if(!this._settings)
		this.loadConfig();
	return this._settings.set_boolean(WEATHER_WIND_DIRECTION_KEY,v);
	},

	get _pressure_units()
	{
		if(!this._settings)
		this.loadConfig();
	return this._settings.get_enum(WEATHER_PRESSURE_UNIT_KEY);
	},

	set _pressure_units(v)
	{
		if(!this._settings)
		this.loadConfig();
	this._settings.set_enum(WEATHER_PRESSURE_UNIT_KEY,v);
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
	return this._settings.get_boolean(WEATHER_USE_SYMBOLIC_ICONS_KEY) ? 1 : 0;
	},

	set _icon_type(v)
	{
		if(!this._settings)
		this.loadConfig();
	this._settings.set_boolean(WEATHER_USE_SYMBOLIC_ICONS_KEY,v);
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

	rebuildSelectCityItem : function()
	{
	let that = this;
	this._selectCity.menu.removeAll();
	let item = null;

	let cities = this._cities;
	cities = cities.split(" && ");
		if(cities && typeof cities == "string")
		cities = [cities];
		if(!cities[0])
		return 0;

		for(let i = 0; cities.length > i; i++)
		{
		item = new PopupMenu.PopupMenuItem(this.extractLocation(cities[i]));
		item.location = i;
			if(i == this._actual_city)
			item.setShowDot(true);
		this._selectCity.menu.addMenuItem(item);
			item.connect('activate', function(actor,event)
			{
			that._actual_city = actor.location;
			});
		}

		if (cities.length == 1)
		this._selectCity.actor.hide();
		else
		this._selectCity.actor.show();

	return 0;
	},

	extractLocation : function()
	{
		if(!arguments[0])
		return "";

		if(arguments[0].search(">") == -1)
		return _("Invalid city");
	return arguments[0].split(">")[1];
	},

	extractWoeid : function()
	{
		if(!arguments[0])
		return 0;

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

		if(cities.length == 0)
		{
		this._cities = "2373572>Cambridge, Massachusetts (US)";
		this.updateCities();
		return 0;
		}

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
				let cityText = city.woeid+">"+city.name;
					if(city.admin1)
					cityText += ", "+city.admin1.content;

					if(city.country)
					cityText += " ("+city.country.code+")";

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
	return 0;
	},

    _onPreferencesActivate : function() {
    Util.spawn(["gnome-shell-extension-prefs","weather-extension@xeked.com"]);
    return 0;
    },

    unit_to_unicode: function() {
	if(this._units == WeatherUnits.FAHRENHEIT)
	return '\u00B0\F';
	else if(this._units == WeatherUnits.KELVIN)
	return 'K';
	else if(this._units == WeatherUnits.RANKINE)
	return '\u00B0\Ra';
	else if(this._units == WeatherUnits.REAUMUR)
	return '\u00B0\R\u00E9';
	else if(this._units == WeatherUnits.ROEMER)
	return '\u00B0\R\u00F8';
	else if(this._units == WeatherUnits.DELISLE)
	return '\u00B0\De';
	else if(this._units == WeatherUnits.NEWTON)
	return '\u00B0\N';
	else
	return '\u00B0\C';
    },

    get_weather_url: function() {
        return encodeURI('http://query.yahooapis.com/v1/public/yql?format=json&q=select * from weather.forecast where woeid = '+this.extractWoeid(this._city)+' and u="f"');
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
                return ['weather-showers'];
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
                return iconname[i]+this.icon_type();
        }
        return 'weather-severe-alert'+this.icon_type();
     },

    has_icon: function(icon) {
        return Gtk.IconTheme.get_default().has_icon(icon+this.icon_type());
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

	toCelsius: function(t)
	{
	return String(Math.round((Number(t)-32)/1.8));
	},

	toKelvin: function(t)
	{
	return String(Math.round(((Number(t)+459.67)/1.8)*100)/100);
	},

	toRankine: function(t)
	{
	return String(Math.round((Number(t)+459.67)*100)/100);
	},

	toReaumur: function(t)
	{
	return String(Math.round((Number(t)-32)/2.25));
	},

	toRoemer: function(t)
	{
	return String(Math.round((((Number(t)-32)*7)/24)+7.5));
	},

	toDelisle: function(t)
	{
	return String(Math.round(((212-Number(t))*5)/6));
	},

	toNewton: function(t)
	{
	return String(Math.round((((Number(t)-32)*11)/60)*10)/10);
	},

	toPascal: function(p,t)
	{
	return Math.round((p * (3386.39-((t-32)*0.003407143))));
	},

	toBeaufort: function(w,t)
	{
		if(w < 1)
		return (!t)?"0":"("+_("Calm")+")";

		else if(w >= 1 && w <= 3)
		return (!t)?"1":"("+_("Light air")+")";

		else if(w >= 4 && w <= 7)
		return (!t)?"2":"("+_("Light breeze")+")";

		else if(w >= 8 && w <= 12)
		return (!t)?"3":"("+_("Gentle breeze")+")";

		else if(w >= 13 && w <= 17)
		return (!t)?"4":"("+_("Moderate breeze")+")";

		else if(w >= 18 && w <= 24)
		return (!t)?"5":"("+_("Fresh breeze")+")";

		else if(w >= 25 && w <= 30)
		return (!t)?"6":"("+_("Strong breeze")+")";

		else if(w >= 31 && w <= 38)
		return (!t)?"7":"("+_("Moderate gale")+")";

		else if(w >= 39 && w <= 46)
		return (!t)?"8":"("+_("Fresh gale")+")";

		else if(w >= 47 && w <= 54)
		return (!t)?"9":"("+_("Strong gale")+")";

		else if(w >= 55 && w <= 63)
		return (!t)?"10":"("+_("Storm")+")";

		else if(w >= 64 && w <= 73)
		return (!t)?"11":"("+_("Violent storm")+")";

		else
		return (!t)?"12":"("+_("Hurricane")+")";
	},

	get_locale_day: function(abr)
	{
	let days = [_('Sunday'),_('Monday'), _('Tuesday'), _('Wednesday'), _('Thursday'), _('Friday'), _('Saturday')];
	return days[abr];
	},

	get_wind_direction : function(deg)
	{
	let arrows = ["\u2193", "\u2199", "\u2190", "\u2196", "\u2191", "\u2197", "\u2192", "\u2198"];
	let letters = [_('N'), _('NE'), _('E'), _('SE'), _('S'), _('SW'), _('W'), _('NW')];
	let idx = Math.round(deg / 45) % arrows.length;
	return (this._wind_direction)?arrows[idx]:letters[idx];
	},

	get_pressure_state : function(state)
	{
		switch(parseInt(state, 3))
		{
			case 0:
			return '';
			break;

			case 1:
			return '\u2934';
			break;

			case 2:
			return '\u2935';
			break;
		}
	return 0;
	},

	icon_type : function(icon_name)
	{
		if(!icon_name)
			if(this._icon_type)
			return "-symbolic";
			else
			return "";

		if(this._icon_type)
			if(String(icon_name).search("-symbolic") != -1)
			return icon_name;
			else
			return icon_name+"-symbolic";
		else
			if(String(icon_name).search("-symbolic") != -1)
			return String(icon_name).replace("-symbolic","");
			else
			return icon_name;
	},

	load_json_async: function(url, fun)
	{
	let here = this;

	let message = Soup.Message.new('GET', url);

		_httpSession.queue_message(message, function(_httpSession, message)
		{
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
	return 0;
	},

	refreshWeather: function(recurse)
	{    
		if(!this.extractWoeid(this._city))
		{
		this.updateCities();
		return 0;
		}
		this.load_json_async(this.get_weather_url(), function(json)
		{
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

		this.rebuildSelectCityItem();

		this._weatherIcon.icon_name = this.icon_type(this._weatherIcon.icon_name);
		this._currentWeatherIcon.icon_name = this.icon_type(this._currentWeatherIcon.icon_name);
		this._forecast[0].Icon.icon_name = this.icon_type(this._forecast[0].Icon.icon_name);
		this._forecast[1].Icon.icon_name = this.icon_type(this._forecast[1].Icon.icon_name);
		this._sunriseIcon.icon_name = this.icon_type(this._sunriseIcon.icon_name);
		this._sunsetIcon.icon_name = this.icon_type(this._sunsetIcon.icon_name);
		this._buildIcon.icon_name = this.icon_type(this._buildIcon.icon_name);

			if(typeof St.IconType != "undefined")
			{
			this._weatherIcon.icon_type = (this._icon_type) ? St.IconType.SYMBOLIC : St.IconType.FULLCOLOR;
			this._currentWeatherIcon.icon_type = (this._icon_type) ? St.IconType.SYMBOLIC : St.IconType.FULLCOLOR;
			this._forecast[0].Icon.icon_type = (this._icon_type) ? St.IconType.SYMBOLIC : St.IconType.FULLCOLOR;
			this._forecast[1].Icon.icon_type = (this._icon_type) ? St.IconType.SYMBOLIC : St.IconType.FULLCOLOR;
			this._sunriseIcon.icon_type = (this._icon_type) ? St.IconType.SYMBOLIC : St.IconType.FULLCOLOR;
			this._sunsetIcon.icon_type = (this._icon_type) ? St.IconType.SYMBOLIC : St.IconType.FULLCOLOR;
			this._buildIcon.icon_type = (this._icon_type) ? St.IconType.SYMBOLIC : St.IconType.FULLCOLOR;
			}

			if(this._old_position_in_panel != this._position_in_panel)
			{
				switch (this._old_position_in_panel) {
					case WeatherPosition.LEFT:
						Main.panel._leftBox.remove_actor(this.actor);
						break;
					case WeatherPosition.CENTER:
						Main.panel._centerBox.remove_actor(this.actor);
						break;
					case WeatherPosition.RIGHT:
						Main.panel._rightBox.remove_actor(this.actor);
						break;
				}

				let children = null;
				switch (this._position_in_panel) {
					case WeatherPosition.LEFT:
						children = Main.panel._leftBox.get_children();
						Main.panel._leftBox.insert_child_at_index(this.actor, children.length);
						break;
					case WeatherPosition.CENTER:
						children = Main.panel._centerBox.get_children();
						Main.panel._centerBox.insert_child_at_index(this.actor, children.length);
						break;
					case WeatherPosition.RIGHT:
						children = Main.panel._rightBox.get_children();
						Main.panel._rightBox.insert_child_at_index(this.actor, 0);
						break;
				}
			this._old_position_in_panel = this._position_in_panel;
			}

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
            let wind_direction = this.get_wind_direction(weather.wind.direction);
            let wind = weather.wind.speed;
            let wind_unit = weather.units.speed;
            let iconname = this.get_weather_icon_safely(weather_c.code);
            let sunrise = weather.astronomy.sunrise;
            let sunset = weather.astronomy.sunset;

		if(typeof this.lastBuildId == "undefined")
		this.lastBuildId = 0;

		if(typeof this.lastBuildDate == "undefined")
		this.lastBuildDate = 0;

		if(this.lastBuildId != weather_c.date || !this.lastBuildDate)
		{
		this.lastBuildId = weather_c.date;
		this.lastBuildDate = new Date();
		}

	    let actualDate = new Date();
	    let d = Math.floor((actualDate.getTime()-this.lastBuildDate.getTime())/86400000);

		switch(this._pressure_units)
		{
			case WeatherPressureUnits.inHg:
			pressure_unit = "inHg";
			break;

			case WeatherPressureUnits.hPa:
			pressure = Math.round(this.toPascal(pressure,temperature)/100);
			pressure_unit = "hPa";
			break;

			case WeatherPressureUnits.bar:
			pressure = this.toPascal(pressure,temperature)/100000;
			pressure_unit = "bar";
			break;

			case WeatherPressureUnits.Pa:
			pressure = this.toPascal(pressure,temperature);
			pressure_unit = "Pa";
			break;

			case WeatherPressureUnits.kPa:
			pressure = Math.round(this.toPascal(pressure,temperature)/100)/10;
			pressure_unit = "kPa";
			break;

			case WeatherPressureUnits.atm:
			pressure = Math.round((this.toPascal(pressure,temperature)*0.00000986923267)*100000)/100000;
			pressure_unit = "atm";
			break;

			case WeatherPressureUnits.at:
			pressure = Math.round((this.toPascal(pressure,temperature)*0.0000101971621298)*100000)/100000;
			pressure_unit = "at";
			break;

			case WeatherPressureUnits.Torr:
			pressure = Math.round((this.toPascal(pressure,temperature)*0.00750061683)*100)/100;
			pressure_unit = "Torr";
			break;

			case WeatherPressureUnits.psi:
			pressure = Math.round((this.toPascal(pressure,temperature)*0.000145037738)*100)/100;
			pressure_unit = "psi";
			break;
		}

		switch(this._units)
		{
			case WeatherUnits.FAHRENHEIT:
			break;

			case WeatherUnits.CELSIUS:
			temperature = this.toCelsius(temperature);
			chill = this.toCelsius(chill);
			break;

			case WeatherUnits.KELVIN:
			temperature = this.toKelvin(temperature);
			chill = this.toKelvin(chill);
			break;

			case WeatherUnits.RANKINE:
			temperature = this.toRankine(temperature);
			chill = this.toRankine(chill);
			break;

			case WeatherUnits.REAUMUR:
			temperature = this.toReaumur(temperature);
			chill = this.toReaumur(chill);
			break;

			case WeatherUnits.ROEMER:
			temperature = this.toRoemer(temperature);
			chill = this.toRoemer(chill);
			break;

			case WeatherUnits.DELISLE:
			temperature = this.toDelisle(temperature);
			chill = this.toDelisle(chill);
			break;

			case WeatherUnits.NEWTON:
			temperature = this.toNewton(temperature);
			chill = this.toNewton(chill);
			break;
		}

	    let lastBuild = (this.lastBuildDate.getHours()%12)+":"+((this.lastBuildDate.getMinutes()<10)?"0":"")+this.lastBuildDate.getMinutes()+" "+((this.lastBuildDate.getHours() >= 12)?"pm":"am");

		if(this._clockFormat == "24h")
		{
		sunrise = new Date("3 Mar 1999 "+sunrise);
		sunrise = sunrise.getHours()+":"+((sunrise.getMinutes()<10)?"0":"")+sunrise.getMinutes();
		sunset = new Date("3 Mar 1999 "+sunset);
		sunset = sunset.getHours()+":"+((sunset.getMinutes()<10)?"0":"")+sunset.getMinutes();
		lastBuild = this.lastBuildDate.getHours()+":"+((this.lastBuildDate.getMinutes()<10)?"0":"")+this.lastBuildDate.getMinutes();
		}

		if(d >= 1)
		{
		lastBuild = _("Yesterday");
			if(d > 1)
			lastBuild = _("%s days ago").replace("%s",d);
		}

            this._currentWeatherIcon.icon_name = this._weatherIcon.icon_name = iconname;

	    let weatherInfoC = "";
	    let weatherInfoT = "";

		if (this._comment_in_panel)
		weatherInfoC = comment;

		if (this._text_in_panel)
		weatherInfoT = parseFloat(temperature).toLocaleString() + ' ' + this.unit_to_unicode();

	    this._weatherInfo.text = weatherInfoC + ((weatherInfoC && weatherInfoT) ? ", " : "") + weatherInfoT;

            this._currentWeatherSummary.text = comment + ", " + parseFloat(temperature).toLocaleString() + ' ' + this.unit_to_unicode();
            this._currentWeatherLocation.text = location;
            this._currentWeatherTemperature.text = parseFloat(chill).toLocaleString() + ' ' + this.unit_to_unicode();
            this._currentWeatherHumidity.text = parseFloat(humidity).toLocaleString() + ' %';
            this._currentWeatherPressure.text = parseFloat(pressure).toLocaleString() + ' ' + pressure_unit + ((pressure_state)?" ":"") + this.get_pressure_state(pressure_state);
	    this._currentWeatherSunrise.text = sunrise;
	    this._currentWeatherSunset.text = sunset;
	    this._currentWeatherBuild.text = lastBuild;

		    // Override wind units with our preference
		    // Need to consider what units the Yahoo API has returned it in
		    switch (this._wind_speed_units)
		    {
		        case WeatherWindSpeedUnits.MPH:
		        break;

		        case WeatherWindSpeedUnits.KPH:
			wind = Math.round (wind / WEATHER_CONV_MPH_IN_MPS * WEATHER_CONV_KPH_IN_MPS);
			wind_unit = 'km/h';
			break;

		        case WeatherWindSpeedUnits.MPS:
			wind = Math.round ((wind / WEATHER_CONV_MPH_IN_MPS) * 10)/ 10;
			wind_unit = 'm/s';
			break;

		        case WeatherWindSpeedUnits.KNOTS:
			wind = Math.round (wind / WEATHER_CONV_MPH_IN_MPS * WEATHER_CONV_KNOTS_IN_MPS);
			wind_unit = 'kn';
			break;

		        case WeatherWindSpeedUnits.FPS:
			wind = Math.round (wind / WEATHER_CONV_MPH_IN_MPS * WEATHER_CONV_FPS_IN_MPS);
			wind_unit = 'ft/s';
			break;

			case WeatherWindSpeedUnits.BEAUFORT:
			wind_unit = this.toBeaufort(wind,true);
			wind = this.toBeaufort(wind);
		    }

            	if (!wind)
            	this._currentWeatherWind.text = '\u2013';
            	else if (wind == 0 || !wind_direction)
            	this._currentWeatherWind.text = parseFloat(wind).toLocaleString() + ' ' + wind_unit;
            	else // i.e. wind > 0 && wind_direction
            	this._currentWeatherWind.text = wind_direction + ' ' + parseFloat(wind).toLocaleString() + ' ' + wind_unit;

            // Refresh forecast
            for (let i = 0; i <= 1; i++) {
                let forecastUi = this._forecast[i];
                let forecastData = forecast[i];

                let code = forecastData.code;
                let t_low = forecastData.low;
                let t_high = forecastData.high;

		switch(this._units)
		{
			case WeatherUnits.FAHRENHEIT:
			break;

			case WeatherUnits.CELSIUS:
			t_low = this.toCelsius(t_low);
			t_high = this.toCelsius(t_high);
			break;

			case WeatherUnits.KELVIN:
			t_low = this.toKelvin(t_low);
			t_high = this.toKelvin(t_high);
			break;

			case WeatherUnits.RANKINE:
			t_low = this.toRankine(t_low);
			t_high = this.toRankine(t_high);
			break;

			case WeatherUnits.REAUMUR:
			t_low = this.toReaumur(t_low);
			t_high = this.toReaumur(t_high);
			break;

			case WeatherUnits.ROEMER:
			t_low = this.toRoemer(t_low);
			t_high = this.toRoemer(t_high);
			break;

			case WeatherUnits.DELISLE:
			t_low = this.toDelisle(t_low);
			t_high = this.toDelisle(t_high);
			break;

			case WeatherUnits.NEWTON:
			t_low = this.toNewton(t_low);
			t_high = this.toNewton(t_high);
			break;
		}

                let comment = forecastData.text;
                if (this._translate_condition)
                    comment = this.get_weather_condition(code);

		let forecastDate = new Date(forecastData.date);
		let dayLeft = Math.floor((actualDate.getTime()-forecastDate.getTime())/1000/60/60/24);

		let date_string = _("Today");
			if(dayLeft == -1)
			date_string = _("Tomorrow");
			else if(dayLeft < -1)
			date_string = _("In %s days").replace("%s",-1*dayLeft);
			else if(dayLeft == 1)
			date_string = _("Yesterday");
			else if(dayLeft > 1)
			date_string = _("%s days ago").replace("%s",dayLeft);

                forecastUi.Day.text = date_string + ' (' + this.get_locale_day(forecastDate.getDay()) + ')';
                forecastUi.Temperature.text = '\u2193 ' + parseFloat(t_low).toLocaleString() + ' ' + this.unit_to_unicode() + '    \u2191 ' + parseFloat(t_high).toLocaleString() + ' ' + this.unit_to_unicode();
                forecastUi.Summary.text = comment;
                forecastUi.Icon.icon_name = this.get_weather_icon_safely(code);
            }
	return 0;
        });

        // Repeatedly refresh weather if recurse is set
        if (recurse) {
            this._timeoutS = Mainloop.timeout_add_seconds(this._refresh_interval, Lang.bind(this, function() {
                this.refreshWeather(true);
            }));
        }
    return 0;
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
            icon_size: 72,
            icon_name: 'view-refresh'+this.icon_type(),
            style_class: 'weather-current-icon'
        });

	this._sunriseIcon = new St.Icon({
            icon_size: 15,
            icon_name: 'weather-clear'+this.icon_type(),
            style_class: 'weather-sunrise-icon'
        });

	this._sunsetIcon = new St.Icon({
            icon_size: 15,
            icon_name: 'weather-clear-night'+this.icon_type(),
            style_class: 'weather-sunset-icon'
        });

	this._buildIcon = new St.Icon({
            icon_size: 15,
            icon_name: 'view-refresh'+this.icon_type(),
            style_class: 'weather-build-icon'
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
	this._currentWeatherBuild = new St.Label({ text: '-' });

	let ab = new St.BoxLayout({	
	style_class: 'weather-current-infobox'	
	});

	ab.add_actor(this._sunriseIcon);
	ab.add_actor(this._currentWeatherSunrise);
	ab.add_actor(this._sunsetIcon);	
	ab.add_actor(this._currentWeatherSunset);
	ab.add_actor(this._buildIcon);	
	ab.add_actor(this._currentWeatherBuild);
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

        rb_captions.add_actor(new St.Label({text: _('Feels like:')}));
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
                icon_size: 48,
                icon_name: 'view-refresh'+this.icon_type(),
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
});

let weatherMenu;

function init() {
Convenience.initTranslations('gnome-shell-extension-weather');
}

function enable() {
    weatherMenu = new WeatherMenuButton();
    Main.panel.addToStatusArea('weatherMenu', weatherMenu);
}

function disable() {
    weatherMenu.stop();
    weatherMenu.destroy();
}
