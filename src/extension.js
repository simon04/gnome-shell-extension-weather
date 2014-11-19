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

// Init const //
const Lang = imports.lang;
const PanelMenu = imports.ui.panelMenu;
const GWeather = imports.gi.GWeather;
const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Mainloop = imports.mainloop;
const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const PopupMenu = imports.ui.popupMenu;
const Gettext = imports.gettext.domain('gnome-shell-extension-weather');
const _ = Gettext.gettext;
const Util = imports.misc.util;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;
const Pango = imports.gi.Pango;

// Settings
const WEATHER_SETTINGS_SCHEMA = 'org.gnome.shell.extensions.weather';
const WEATHER_GWEATHER_SETTINGS_SCHEMA = 'org.gnome.GWeather';
const WEATHER_TEMPERATURE_UNIT_KEY = 'temperature-unit';		// GWeather setting
const WEATHER_SPEED_UNIT_KEY = 'speed-unit';				// GWeather setting
const WEATHER_PRESSURE_UNIT_KEY = 'pressure-unit';			// GWeather setting
const WEATHER_DISTANCE_UNIT_KEY = 'distance-unit';			// GWeather setting
const WEATHER_CITY_KEY = 'city';					// Weather extension setting
const WEATHER_ACTUAL_CITY_KEY = 'actual-city';				// Weather extension setting
const WEATHER_USE_SYMBOLIC_ICONS_KEY = 'use-symbolic-icons';		// Weather extension setting
const WEATHER_SHOW_TEXT_IN_PANEL_KEY = 'show-text-in-panel';		// Weather extension setting
const WEATHER_POSITION_IN_PANEL_KEY = 'position-in-panel';		// Weather extension setting
const WEATHER_SHOW_COMMENT_IN_PANEL_KEY = 'show-comment-in-panel';	// Weather extension setting
const WEATHER_WIND_DIRECTION_KEY = 'wind-direction';			// Weather extension setting
const WEATHER_DEBUG_EXTENSION = 'debug-extension';			// Weather extension setting

	// Init Weather class //
	const Weather = new Lang.Class(
	{
	Name : "Weather",

	Extends: PanelMenu.Button,

		_init : function()
		{
		this.variation("temperature_units");
		this.variation("speed_units");
		this.variation("distance_units");
		this.variation("pressure_units");
		this.variation("cities_names");
		this.variation("city_name");
		this.variation("symbolic_icon");
		this.variation("text_in_panel");
		this.variation("position_in_panel");
		this.variation("comment_in_panel");
		this.variation("clock_format");
		this.variation("wind_direction");
		this.variation("debug");									this.status("Initialized GWeather");

		let menuAlignment = 0.25;
			if (Clutter.get_default_text_direction() == Clutter.TextDirection.RTL)
			menuAlignment = 1.0 - menuAlignment;
														this.status("Menu alignment = "+menuAlignment);
		this.parent(menuAlignment);									this.status("Weather panel menu button initialized");
		this.initUI();
		this.start();
		return 0;
		},

		variation : function(variable,keep)
		{
			if(!variable)
			return 0;

			if(typeof this.past == "undefined")
			this.past = {};

			if(typeof this.past[variable] == "undefined")
			{
				if(typeof this[variable] != "undefined")
				this.past[variable] = this[variable];
			return 0;
			}

			if(this.past[variable] === this[variable])
			return 0;

			if(!keep)
			this.past[variable] = this[variable];
		return 1;
		},

		status : function()
		{
			if(typeof this.logfile == "undefined")
			{
			this.logfile = Gio.file_new_for_path(GLib.get_user_cache_dir()+"/weather-extension.log");
				if(this.logfile.query_exists(null))
				this.logfile.delete(null);
			}

			if(!this.debug)
			return 0;

		let fileOutput = this.logfile.append_to(Gio.FileCreateFlags.PRIVATE,null);
			if(!arguments[0])
			fileOutput.write("\n",null);
			else
			fileOutput.write("["+new Date().toString()+"] "+arguments[0]+"\n",null);
		fileOutput.close(null);
		return 0;
		},

		world : GWeather.Location.new_world(false),

		start : function()
		{												this.status("Starting Weather");
		this.weatherStatus("load");
		let that = this;

		this.loadConfig();
		this.loadGWeatherConfig();
		this.loadInterfaceConfig();

		this.location = this.city;
			if(this.city_name)
			{											this.status("Location ("+this.city_name+") loaded");
			this.info = new GWeather.Info({location: this.location});				this.status("Information loaded");

			this.info.set_enabled_providers(GWeather.Provider.METAR |
					                GWeather.Provider.OWM |
							GWeather.Provider.YR_NO |
							GWeather.Provider.IWIN);

			this.infoC = this.info.connect("updated",function(){that.refresh();that.status(0);});	this.status("Information connection started");
			}
			else
			{
			this.weatherStatus("nolocation");
			}

		this.refreshUI();

			if(this.city_name)
			{
				this.timer = Mainloop.timeout_add_seconds(30, Lang.bind(this, function() {
				this.info.update();
				return true;
				}));										this.status("Timer started");
			this.info.update();
			}											this.status("Weather started"); this.status(0);
		return 0;
		},

		stop : function()
		{												this.status("Stopping Weather");
			if(this.timer)
			{
			Mainloop.source_remove(this.timer);							this.status("Timer stopped");
			}

			if(this.infoC)
			{
			this.info.disconnect(this.infoC);
			this.infoC = 0;
			delete this.info;
			delete this.location;									this.status("Information connection stopped");
			}

			if(this.settingsC)
			{
			this.settings.disconnect(this.settingsC);
			this.settingsC = 0;
			delete this.settings;									this.status("Setting connection stopped");
			}

			if(this.GWeatherSettingsC)
			{
			this.GWeatherSettings.disconnect(this.GWeatherSettingsC);
			this.GWeatherSettingsC = 0;
			delete this.GWeatherSettings;								this.status("GWeather setting connection stopped");
			}

		this.build = 0;

		this.weatherStatus(0);										this.status("Stopped"); this.status(0);
		return 0;
		},

		restart : function()
		{
		this.stop();
		this.start();
		return 0;
		},

		weatherStatus : function()
		{
			switch(arguments[0])
			{
				case "nolocation":
				this.UI.menuConditions.text = _('Weather');
				this.UI.menuIcon.icon_name = 'weather-clear'+this.icon_type();
				this.UI.current.set_child(new St.Label({ text: _('No location configured') }));
				this.UI.forecast.hide();
				this.UI.attribution.hide();
				break;

				case "load":
				this.UI.menuConditions.text = _('Weather');
				this.UI.menuIcon.icon_name = 'view-refresh'+this.icon_type();
				this.UI.current.set_child(new St.Label({ text: _('Loading weather') }));
				this.UI.forecast.hide();
				this.UI.attribution.hide();
				break;

				case "error":
				this.UI.menuConditions.text = _('Weather');
				this.UI.menuIcon.icon_name = 'weather-severe-alert'+this.icon_type();
				this.rebuildCurrentItem(0);
				this.rebuildForecastItem(0);
				this.rebuildAttributionItem(0);
				break;

				default:
				this.UI.menuConditions.text = _('Weather');
				this.UI.menuIcon.icon_name = 'weather-clear'+this.icon_type();
				this.UI.current.set_child(new St.Label({ text: _('Weather extension ready') }));
				this.UI.forecast.hide();
				this.UI.attribution.hide();
			}
		return 0;
		},

		refresh : function()
		{												this.status("Refreshing");
		let that = this;
			if(!this.info.is_valid())
			{
			this.weatherStatus("error");								this.status("Informations is invalid");
			this.build = 0;
			return 0;
			}

			let getConditions = function(info)
			{
			let conditions = info.get_conditions();
				if(conditions == "-")
				conditions = info.get_sky();
			return conditions;
			};

			let getMenuConditions = function(info)
			{
			let conditions = "";
				if(that.comment_in_panel)
				conditions += getConditions(info);

				if(that.comment_in_panel && that.text_in_panel)
				conditions += _(", ");

				if(that.text_in_panel)
				conditions += that.temperature_string();

			return conditions;
			};

			let getLocaleTime = function(date, localTimezone)
			{
				if(!localTimezone)
				date = GLib.DateTime.new_from_unix_local(date).to_timezone(that.get_timezone());
				else
				date = GLib.DateTime.new_from_unix_local(date).to_timezone(GLib.TimeZone.new_local());

			let localeTime = "-";
				if(that.clock_format == "12h")
				{
				localeTime = date.format("%l:%M %p");
				}
				else
				{
				localeTime = date.format("%R");
				}
			return localeTime;
			};

		let tempUnitVar = this.variation("temperature_units");
		let speedUnitVar = this.variation("speed_units");
		let distUnitVar = this.variation("distance_units");
		let presUnitVar = this.variation("pressure_units");
		let cityVar = this.variation("city_name");
		let textInPanelVar = this.variation("text_in_panel");
		let commentInPanelVar = this.variation("comment_in_panel");
		let windDirectionVar = this.variation("wind_direction");
		let clockFormatVar = this.variation("clock_format");						this.status("Variation readed");

		let first = false;
			if(!this.build)
			{
			first = true;										this.status("First build");
			this.build = this.info.get_update();
			this.variation("build");
			}
			else
			{
			this.build = this.info.get_update();
			}

		let update = false;
			if(this.variation("build"))
			{
			update = true;										this.status("Update information");
			}

		let fuc = (first || update || cityVar);
		let di_up = (first)?"displayed":"updated";

			if(fuc || tempUnitVar)
			{			
			this.forecast = this.loadForecast();							this.status(this.forecast.length+" forecast");
			}

			if(fuc)
			{
			this.rebuildCurrentItem(1);
			this.rebuildForecastItem(this.forecast.length);
			this.rebuildAttributionItem(this.info.get_attribution());

			this.UI.menuIcon.icon_name = this.UI.currentIcon.icon_name = this.icon_type(this.info.get_icon_name());
			this.UI.currentSunrise.text = getLocaleTime(this.info.get_value_sunrise()[1]);
			this.UI.currentSunset.text = getLocaleTime(this.info.get_value_sunset()[1]);
			this.UI.currentBuild.text = getLocaleTime(this.info.get_value_update()[1], 1);
			this.UI.currentLocation.text = this.location.get_city_name()+_(", ")+getConditions(this.info);
			this.UI.currentHumidity.text = this.info.get_humidity();				this.status("Basics informations "+di_up);
			}

			if(fuc || tempUnitVar)
			{
			this.UI.currentSummary.text = this.temperature_string();
			this.UI.currentLocation.text = this.location.get_city_name()+_(", ")+getConditions(this.info);
			this.UI.menuConditions.text = getMenuConditions(this.info);
			this.UI.currentTemperature.text = this.temperature_string(this.info.get_value_apparent(this.temperature_units)[1]);
														this.status("Temperatures informations "+di_up);
			}

			if(fuc || speedUnitVar || windDirectionVar)
			{
			this.UI.currentWind.text = this.wind_string();						this.status("Wind information "+di_up);
			}

			if(fuc || distUnitVar)
			{
			this.UI.currentVisibility.text = this.info.get_visibility();				this.status("Distance information "+di_up);
			}

			if(fuc || presUnitVar)
			{
			this.UI.currentPressure.text = this.info.get_pressure();				this.status("Pressure information "+di_up);
			}

			if(textInPanelVar || commentInPanelVar)
			{
			this.UI.menuConditions.text = getMenuConditions(this.info);				this.status("Panel information "+di_up);
			}

			if(clockFormatVar)
			{
			this.UI.currentSunrise.text = getLocaleTime(this.info.get_value_sunrise()[1]);
			this.UI.currentSunset.text = getLocaleTime(this.info.get_value_sunset()[1]);
			this.UI.currentBuild.text = getLocaleTime(this.info.get_value_update()[1], 1)
			}

			for(let i in this.forecast)
			{
				if(fuc)
				{
				this.UI.forecastItems[i].icon.icon_name = this.icon_type(this.forecast[i].icon);
				this.UI.forecastItems[i].day.text = this.forecast[i].dayText;			this.status("Basics forecast ("+i+") informations "+di_up);
				}

				if(fuc || tempUnitVar)
				{
				this.UI.forecastItems[i].temp_min.text = "\u2193 "+this.temperature_string(this.forecast[i].minTemp);
				this.UI.forecastItems[i].temp_max.text = "\u2191 "+this.temperature_string(this.forecast[i].maxTemp);
														this.status("Temperatures forecast ("+i+") informations "+di_up);
				}
			}											this.status("Refreshed");
		return 0;
		},

		loadForecast : function()
		{												this.status("Load forecast object");
		let forecast = [];
		let day = 0;
		let hour = 0;
		let unit = this.temperature_units;
		let initialTemp = 0;
		let actualDate = GLib.DateTime.new_now_local();

			let dayName = function(aD, nD)
			{
			let oneDay = 86400;
			let today = GLib.DateTime.new_local(aD.get_year(), aD.get_month(), aD.get_day_of_month(), 0, 0, 0);
			today = (today.to_unix()+(aD.get_utc_offset()/1000000));
			let nDTS = (nD.to_unix()+(nD.get_utc_offset()/1000000));
			let cur = (nDTS-today);

			let dN = nD.format("%a, %x");
			dN = dN.charAt(0).toUpperCase() + dN.slice(1);

				if(cur >= oneDay && cur < oneDay*7)
				{
				dN = nD.format("%A");
				dN = dN.charAt(0).toUpperCase() + dN.slice(1);
				}

				if(cur < oneDay && cur >= 0)
				dN = _("Today");

				if(cur >= oneDay && cur < oneDay*2)
				dN = _("Tomorrow");

				if(cur < 0 && cur > oneDay*-1)
				dN = _("Yesterday");

			return dN;
			};

		let oldDate = {};
		let nowDate = {};

		let forecastList = this.info.get_forecast_list();						this.status("Forecast list loaded ("+forecastList.length+")");

		oldDate = GLib.DateTime.new_from_unix_local(forecastList[0].get_value_update()[1]).to_timezone(this.get_timezone());

			for(let i in forecastList)
			{
			if (forecastList[i] == null) continue;

			nowDate = GLib.DateTime.new_from_unix_local(forecastList[i].get_value_update()[1]).to_timezone(this.get_timezone());

				if(forecastList[i-1] != "undefined" && (oldDate.get_day_of_month() != nowDate.get_day_of_month()))
				{										this.status("+1 day");
				day++;
				}
														this.status("Forecast "+i+" (Day : "+day+") :");
				if(typeof forecast[day] == "undefined")
				{										this.status("Init new day ("+day+")");
				initialTemp = forecastList[i].get_value_temp(unit)[1];				this.status("Initial temperature : "+initialTemp);
				forecast[day] = {hour : []};
				forecast[day].minTemp = initialTemp;
					if(forecastList[i].get_value_temp_min(unit)[0])
					forecast[day].minTemp = forecastList[i].get_value_temp_min(unit)[1];
				forecast[day].maxTemp = initialTemp;
					if(forecastList[i].get_value_temp_max(unit)[0])
					forecast[day].maxTemp = forecastList[i].get_value_temp_max(unit)[1];
				forecast[day].icon = "";
				forecast[day].dayText = dayName(actualDate, nowDate);				this.status("Day name : "+forecast[day].dayText);
				this.status("Forecast "+i+" inited");
				}

			hour = nowDate.get_hour();
			forecast[day].hour[hour] = forecastList[i];						this.status("Forecast for "+forecast[day].dayText+" at "+hour);

			let temp = forecastList[i].get_value_temp(unit)[1];					this.status("Temp : "+temp);

				if(temp <= forecast[day].minTemp)
				forecast[day].minTemp = temp;

				if(temp >= forecast[day].maxTemp)
				forecast[day].maxTemp = temp;

			oldDate = nowDate;
			}

			for(let i in forecast)
			{
			let div = [[],[],[],[]];

				for(let x in forecast[i].hour)
				{
					if(x >= 0 && x < 6)
					div[0][x] = forecast[i].hour[x];
					else if(x >= 6 && x < 12)
					div[1][x] = forecast[i].hour[x];
					else if(x >= 12 && x < 18)
					div[2][x] = forecast[i].hour[x];
					else if(x >= 18 && x <= 23)
					div[3][x] = forecast[i].hour[x];
				}

				let div_length = function(div)
				{
				let divLength = 0;

					for(let i in div)
					divLength++;

				return divLength;
				}

				let getIconName = function(div)
				{
				let middle = Math.floor(div_length(div)/2);
				let i = 0;

					for(let hour in div)
					{
						if(i == middle)
						return div[hour].get_icon_name();
					i++
					}

				return "";
				};

				if(div_length(div[2]))
				{							this.status(i+", Afternoon");
				forecast[i].icon = getIconName(div[2]);			this.status("Loaded "+forecast[i].icon+" icon");
				}
				else if(div_length(div[1]))
				{							this.status(i+", Morning");
				forecast[i].icon = getIconName(div[1]);			this.status("Loaded "+forecast[i].icon+" icon");
				}
				else if(div_length(div[3]))
				{							this.status(i+", Evening");
				forecast[i].icon = getIconName(div[3]);			this.status("Loaded "+forecast[i].icon+" icon");
				}
				else if(div_length(div[0]))
				{							this.status(i+", Night");
				forecast[i].icon = getIconName(div[0]);			this.status("Loaded "+forecast[i].icon+" icon");
				}
			}

		return forecast;
		},

		initUI : function()
		{
		this.UI = {};

		this.UI.menuConditions = new St.Label({ y_align: Clutter.ActorAlign.CENTER, text: _('Weather') });	this.status("UI.menuCoditions created");

		// Panel icon
		this.UI.menuIcon = new St.Icon(
		{
		icon_name: 'weather-clear'+this.icon_type(),
		style_class: 'system-status-icon weather-icon' + 
		(Main.panel.actor.get_text_direction() == Clutter.TextDirection.RTL ? '-rtl' : '')
		});												this.status("UI.menuIcon created");

		// Putting the panel item together
		let topBox = new St.BoxLayout();
		topBox.add_actor(this.UI.menuIcon);
		topBox.add_actor(this.UI.menuConditions);
		this.actor.add_actor(topBox);

		let dummyBox = new St.BoxLayout();
		this.actor.reparent(dummyBox);
		dummyBox.remove_actor(this.actor);
		dummyBox.destroy();

		let children = null;
			switch (this.position_in_panel)
			{
				case 0:
				children = Main.panel._centerBox.get_children();
				Main.panel._centerBox.insert_child_at_index(this.actor, children.length);	this.status("Panel icon inserted in center box");
				break;

				case 1:
				children = Main.panel._rightBox.get_children();
				Main.panel._rightBox.insert_child_at_index(this.actor, 0);			this.status("Panel icon inserted in right box");
				break;

				case 2:
				children = Main.panel._leftBox.get_children();
				Main.panel._leftBox.insert_child_at_index(this.actor, children.length);		this.status("Panel icon inserted in left box");
				break;
			}

		Main.panel.menuManager.addMenu(this.menu);							this.status("menu added to menu manager (panel)");

		let item;

		this.UI.current = new St.Bin({style_class: 'current'});						this.status("UI.current created");
		this.UI.forecast = new St.Bin({style_class: 'forecast'});					this.status("UI.forecast created");
		this.UI.attribution = new St.Bin({style_class: 'attribution'});					this.status("UI.attribution created");
		
		this.menu.box.add(this.UI.current);								this.status("UI.current added to menu");

		item = new PopupMenu.PopupSeparatorMenuItem();
		this.menu.addMenuItem(item);									this.status("Added separator");
		
		this.menu.box.add(this.UI.forecast);

		item = new PopupMenu.PopupSeparatorMenuItem();							this.status("UI.forecast added to menu");
		this.menu.addMenuItem(item);									this.status("Added separator");
		
		this.menu.box.add(this.UI.attribution);								this.status("UI.attribution added to menu");
		this.UI.attribution.hide();

		item = new PopupMenu.PopupSeparatorMenuItem();
		this.menu.addMenuItem(item);									this.status("Added separator");

		this.UI.locationSelector = new PopupMenu.PopupSubMenuMenuItem(_("Locations"));			this.status("UI.locationSelector created");
		this.menu.addMenuItem(this.UI.locationSelector);						this.status("UI.locationSelector added to menu");
		this.rebuildLocationSelectorItem();								this.status("Location selector builded");

		this.UI.reloadButton = new PopupMenu.PopupMenuItem(_("Reload Weather Information"));
		this.UI.reloadButton.connect('activate', Lang.bind(this, function(){this.info.update();}));
		this.menu.addMenuItem(this.UI.reloadButton);
		this.UI.reloadButton.actor.hide();

		item = new PopupMenu.PopupMenuItem(_("Weather Settings"));
		item.connect('activate', Lang.bind(this, this.onPreferencesActivate));
		this.menu.addMenuItem(item);									this.status("Preference button added to menu");
		this.weatherStatus(0);										this.status("UI initialized");
		return 0;
		},

		refreshUI : function()
		{												this.status("Refresh UI");
			if(this.info)
			this.UI.reloadButton.actor.show();
			else
			this.UI.reloadButton.actor.hide();

		let oldPosition = this.past.position_in_panel;

			if(this.variation("position_in_panel"))
			{
				switch (oldPosition) {
					case 0:
						Main.panel._centerBox.remove_actor(this.actor);			this.status("Removed panel icon from center box");
						break;
					case 1:
						Main.panel._rightBox.remove_actor(this.actor);			this.status("Removed panel icon from right box");
						break;
					case 2:
						Main.panel._leftBox.remove_actor(this.actor);			this.status("Removed panel icon from left box");
						break;
				}

				let children = null;
				switch (this.position_in_panel) {
					case 0:
						children = Main.panel._centerBox.get_children();
						Main.panel._centerBox.insert_child_at_index(this.actor, children.length);	this.status("Panel icon inserted in center box");
						break;
					case 1:
						children = Main.panel._rightBox.get_children();
						Main.panel._rightBox.insert_child_at_index(this.actor, 0);			this.status("Panel icon inserted in right box");
						break;
					case 2:
						children = Main.panel._leftBox.get_children();
						Main.panel._leftBox.insert_child_at_index(this.actor, children.length);		this.status("Panel icon inserted in left box");
						break;
				}
			}

			if(this.variation("cities_names") || this.variation("city_name",true))
			{
			this.rebuildLocationSelectorItem();									this.status("Location selector rebuilded");
			}

			if(this.variation("symbolic_icon"))
			{
			this.UI.menuIcon.icon_name = this.icon_type(this.UI.menuIcon.icon_name);				this.status("Rebuilded menu icon");

				if(typeof this.UI.currentIcon != "undefined")
				{
				this.UI.currentIcon.icon_name = this.icon_type(this.UI.currentIcon.icon_name);			this.status("Rebuilded current icon");
				}

				if(typeof this.UI.sunriseIcon != "undefined")
				{
				this.UI.sunriseIcon.icon_name = this.icon_type(this.UI.sunriseIcon.icon_name);			this.status("Rebuilded sunrise icon");
				}

				if(typeof this.UI.sunsetIcon != "undefined")
				{
				this.UI.sunsetIcon.icon_name = this.icon_type(this.UI.sunsetIcon.icon_name);			this.status("Rebuilded sunset icon");
				}

				if(typeof this.UI.buildIcon != "undefined")
				{
				this.UI.buildIcon.icon_name = this.icon_type(this.UI.buildIcon.icon_name);			this.status("Rebuilded build icon");
				}

				if(typeof this.UI.forecastItems != "undefined")
					for(let i = 0; i < this.UI.forecastItems.length; i++)
					{
					let icon = this.icon_type(this.UI.forecastItems[i].icon.icon_name);
					this.UI.forecastItems[i].icon.icon_name = icon;						this.status("Rebuilded forecast ("+i+") icon");
					}
			}													this.status("UI refreshed");
		return 0;
		},

		rebuildLocationSelectorItem : function()
		{
		let that = this;
		this.UI.locationSelector.menu.removeAll();
		let item = null;

		let cities = this.cities;

			if (cities.length <= 1)
			this.UI.locationSelector.actor.hide();
			else
			this.UI.locationSelector.actor.show();

			if(!cities[0])
			return 0;

			for(let i = 0; cities.length > i; i++)
			{
			item = new PopupMenu.PopupMenuItem(cities[i].get_city_name());
			item.location = i;

				if(i == this.actual_city)
				(typeof item.setShowDot == "function") ? item.setShowDot(true) : item.setOrnament(PopupMenu.Ornament.DOT);

			this.UI.locationSelector.menu.addMenuItem(item);

				item.connect('activate', function(actor,event)
				{
				that.actual_city = actor.location;
				});
			}

		return 0;
		},

		destroyCurrent : function()
		{
			if (this.UI.current.get_child() != null)
			this.UI.current.get_child().destroy();
		return 0;
		},

		destroyForecast : function()
		{
			if (this.UI.forecast.get_child() != null)
			this.UI.forecast.get_child().destroy();
		return 0;
		},

		destroyAttribution : function()
		{
			if (this.UI.attribution.get_child() != null)
			this.UI.attribution.get_child().destroy();
		return 0;
		},

		rebuildAttributionItem : function(text)
		{
		this.destroyAttribution();

		text = String(text).replace(/(<([^>]+)>)/ig, "");
			if(text == "null" || text == 0)
			text = "";

		this.UI.attribution.set_child(new St.Label({ text: text }));

			if(text.length)
			this.UI.attribution.show();
			else
			this.UI.attribution.hide();
		return 0;
		},

		rebuildCurrentItem : function(n)
		{
			if(!n)
			{
				if(typeof this.info == "undefined" || (typeof this.info != "undefined" && !this.info.get_location_name()))
				this.UI.current.set_child(new St.Label({ text: _('No weather information') }));
				else
				this.UI.current.set_child(new St.Label({ text: _('No weather information for %s').replace("%s",this.info.get_location_name()) }));
			return 0;
			}

		this.destroyCurrent();

		this.UI.current.show();

		// This will hold the icon for the current weather
		this.UI.currentIcon = new St.Icon({
		icon_size: 72,
		icon_name: 'view-refresh'+this.icon_type(),
		style_class: 'weather-current-icon'
		});

		this.UI.sunriseIcon = new St.Icon({
		icon_size: 15,
		icon_name: 'weather-clear'+this.icon_type(),
		style_class: 'weather-sunrise-icon'
		});

		this.UI.sunsetIcon = new St.Icon({
		icon_size: 15,
		icon_name: 'weather-clear-night'+this.icon_type(),
		style_class: 'weather-sunset-icon'
		});

		this.UI.buildIcon = new St.Icon({
		icon_size: 15,
		icon_name: 'view-refresh'+this.icon_type(),
		style_class: 'weather-build-icon'
		});

		this.UI.currentLocation = new St.Label({ text: '-' });

		// The summary of the current weather
		this.UI.currentSummary = new St.Label({
		text: '-',
		style_class: 'weather-current-summary'
		});

		let bb = new St.BoxLayout({
		vertical: true,
		style_class: 'weather-current-summarybox'
		});
		bb.add_actor(this.UI.currentLocation);
		bb.add_actor(this.UI.currentSummary);

		this.UI.currentSunrise = new St.Label({ text: '-' });
		this.UI.currentSunset = new St.Label({ text: '-' });
		this.UI.currentBuild = new St.Label({ text: '-' });

		let ab = new St.BoxLayout({	
		style_class: 'weather-current-infobox'	
		});

		ab.add_actor(this.UI.sunriseIcon);
		ab.add_actor(this.UI.currentSunrise);
		ab.add_actor(this.UI.sunsetIcon);	
		ab.add_actor(this.UI.currentSunset);
		ab.add_actor(this.UI.buildIcon);	
		ab.add_actor(this.UI.currentBuild);
		bb.add_actor(ab);

		// Other labels
		this.UI.currentTemperature = new St.Label({ text: '-' });
		this.UI.currentVisibility = new St.Label({ text: '-' });
		this.UI.currentHumidity = new St.Label({ text:  '-' });
		this.UI.currentPressure = new St.Label({ text: '-' });
		this.UI.currentWind = new St.Label({ text: '-' });

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

		rb_captions.add_actor(new St.Label({text: _('Feels like')}));
		rb_values.add_actor(this.UI.currentTemperature);
		rb_captions.add_actor(new St.Label({text: _('Visibility')}));
		rb_values.add_actor(this.UI.currentVisibility);
		rb_captions.add_actor(new St.Label({text: _('Humidity')}));
		rb_values.add_actor(this.UI.currentHumidity);
		rb_captions.add_actor(new St.Label({text: _('Pressure')}));
		rb_values.add_actor(this.UI.currentPressure);
		rb_captions.add_actor(new St.Label({text: _('Wind')}));
		rb_values.add_actor(this.UI.currentWind);

		let xb = new St.BoxLayout();
		xb.add_actor(bb);
		xb.add_actor(rb);

		let box = new St.BoxLayout({
		style_class: 'weather-current-iconbox'
		});
		box.add_actor(this.UI.currentIcon);
		box.add_actor(xb);
		this.UI.current.set_child(box);
		return 0;
		},

		rebuildForecastItem : function(n)
		{
		let that = this;

			if(!n)
			{
			this.UI.forecast.set_child(new St.Label({ text: _('No forecast information') }));
			return 0;
			}

		this.destroyForecast();

		this.UI.forecast.show();

		this.UI.forecastItems = [];
		this.UI.forecastBox = new St.ScrollView({style_class: 'weather-forecasts'});

		this.UI.forecastBox.hscroll.margin_right = 25;
		this.UI.forecastBox.hscroll.margin_left = 25;
		this.UI.forecastBox.hscroll.margin_top = 10;
		this.UI.forecastBox.hscroll.hide();
		this.UI.forecastBox.vscrollbar_policy = Gtk.PolicyType.NEVER;
		this.UI.forecastBox.hscrollbar_policy = Gtk.PolicyType.AUTOMATIC;

			let scrollTo = function(scroller, v)
			{
			scroller.adjustment.value += v;
			};

			let onScroll = function(actor, event)
			{
			let dx = 0;
				switch (event.get_scroll_direction())
				{
				case Clutter.ScrollDirection.UP:
				dx = -1;
				break;
				case Clutter.ScrollDirection.DOWN:
				dx = 1;
				break;
				default:
				return true;
				}

			scrollTo(that.UI.forecastBox.hscroll, dx * that.UI.forecastBox.hscroll.adjustment.stepIncrement);
			return false;
			};

		let action = new Clutter.PanAction({ interpolate: true });

			action.connect('pan', function(act){
			let [dist, dx, dy] = act.get_motion_delta(0);

			scrollTo(that.UI.forecastBox.hscroll, (-1 * (dx / that.UI.forecastBox.width) * that.UI.forecastBox.hscroll.adjustment.page_size));

			return false;
			});

		this.UI.forecastBox.add_action(action);

		this.UI.forecastBox.connect('scroll-event', onScroll);
		this.UI.forecastBox.hscroll.connect('scroll-event', onScroll);

		this.UI.forecastBox.enable_mouse_scrolling = true;

		this.UI.forecast.set_child(this.UI.forecastBox);

			for (let i = 0; i < n; i++)
			{
			let forecastWeather = {};

			forecastWeather.icon = new St.Icon({
			icon_size: 32,
			icon_name: 'view-refresh'+this.icon_type(),
			style_class: 'weather-forecast-icon'
			});

			forecastWeather.temp_min = new St.Label({
			style_class: 'weather-forecast-temp-min'
			});

			forecastWeather.temp_max = new St.Label({
			style_class: 'weather-forecast-temp-max'
			});

			let minmax = new St.BoxLayout({
			vertical: true,
			style_class: 'weather-forecast-minmax'
			});
			minmax.add_actor(forecastWeather.temp_max);
			minmax.add_actor(forecastWeather.temp_min);

			let iconminmax = new St.BoxLayout({
			style_class: 'weather-forecast-iconminmax'
			});
			iconminmax.add_actor(forecastWeather.icon);
			iconminmax.add_actor(minmax);

			let iconminmaxbox = new St.Bin({
			style_class: 'weather-forecast-minmax-box'
			});
			iconminmaxbox.set_child(iconminmax);

			forecastWeather.day = new St.Label({
			style_class: 'weather-forecast-day'
			});

			let daybox = new St.BoxLayout({
			vertical: true,
			style_class: 'weather-forecast-daybox'
			});
			daybox.add_actor(forecastWeather.day);

			let bb = new St.BoxLayout({
			vertical: true,
			style_class: 'weather-forecast-box'
			});
			bb.add_actor(iconminmaxbox);
			bb.add_actor(daybox);

			forecastWeather.box = bb;

			this.UI.forecastItems[i] = forecastWeather;
			}

				let box = new St.Bin();
				let columnBox = new St.BoxLayout();
				box.set_child(columnBox);

					for(let j = 0; this.UI.forecastItems[j]; j++)
					{
						if(j > 2)				
						this.UI.forecastBox.hscroll.show();
					columnBox.add_actor(this.UI.forecastItems[j].box);
					}

				let cont = new St.BoxLayout();
				cont.add_actor(box);
				this.UI.forecastBox.add_actor(cont);
		return 0;
		},

		icon_type : function(icon_name)
		{
			if(!icon_name)
				if(this.symbolic_icon)
				return "-symbolic";
				else
				return "";

			if(String(icon_name).search("weather-clear-night") != -1 && this.symbolic_icon)
			icon_name = "weather-clear-night";
			else if(String(icon_name).search("weather-few-clouds-night") != -1 && this.symbolic_icon)
			icon_name = "weather-few-clouds-night";

			if(this.symbolic_icon)
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

		onPreferencesActivate : function()
		{
		Util.spawn(["gnome-shell-extension-prefs","weather-extension@xeked.com"]);
		return 0;
		},

		get_timezone : function()
		{
		let timezone = this.location.get_timezone();
		return GLib.TimeZone.new(timezone.get_tzid());
		},

		temperature_string : function(a)
		{
		let unit = this.temperature_units;
		let temp = a;
			if(!a)
			temp = this.info.get_value_temp(unit)[1];

		temp = parseFloat(Math.round(temp*10)/10).toLocaleString();

			switch(unit)
			{
				case GWeather.TemperatureUnit.FAHRENHEIT :
				return _("%s °F").replace("%s", temp);
				break;

				case GWeather.TemperatureUnit.CENTIGRADE :
				return _("%s °C").replace("%s", temp);
				break;

				case GWeather.TemperatureUnit.KELVIN :
				return _("%s K").replace("%s", temp);
				break;

				case GWeather.TemperatureUnit.INVALID :
				case GWeather.TemperatureUnit.DEFAULT :
				default :
				return _("Unknown");
			}
		return 0;
		},

		wind_string : function(a)
		{
		let that = this;
		let unit = this.speed_units;

		let wind = a;
			if(!a)
			wind = [this.info.get_value_wind(unit)[1], this.info.get_value_wind(unit)[2]];

			if(!wind[0])
			return "-";

		let v = parseFloat(Math.round(wind[0]*10)/10).toLocaleString();
		let d = wind[1];

			let get_wind_direction = function(d)
			{
			let arrows = ['', _('VAR')+' ', "\u2193 ", "\u2199 ", "\u2199 ", "\u2199 ", "\u2190 ", "\u2196 ", "\u2196 ", "\u2196 ",
				     "\u2191 ", "\u2197 ", "\u2197 ", "\u2197 ", "\u2192 ", "\u2198 ", "\u2198 ", "\u2198 ", ('-')+' '];

			let letters = ['', _('VAR')+' ', _('N')+' ', _('NNE')+' ', _('NE')+' ', _('ENE')+' ', _('E')+' ', _('ESE')+' ', _('SE')+' ', _('SSE')+' ', 
				      _('S')+' ', _('SSW')+' ', _('SW')+' ', _('WSW')+' ', _('W')+' ', _('WNW')+' ', _('NW')+' ', _('NNW')+' ', ('-')+' '];

			return (that.wind_direction)?arrows[d]:letters[d];
			};

		let direction = get_wind_direction(d+1);

			switch(unit)
			{
				case GWeather.SpeedUnit.KNOTS :
				return _("$d$s knots").replace("$d", direction).replace("$s", v);
				break;

				case GWeather.SpeedUnit.MPH :
				return _("$d$s mph").replace("$d", direction).replace("$s", v);
				break;

				case GWeather.SpeedUnit.KPH :
				return _("$d$s km/h").replace("$d", direction).replace("$s", v);
				break;

				case GWeather.SpeedUnit.MS :
				return _("$d$s m/s").replace("$d", direction).replace("$s", v);
				break;

				case GWeather.SpeedUnit.BFT :
				return _("$dBeaufort $s").replace("$d", direction).replace("$s", v);
				break;

				case GWeather.SpeedUnit.INVALID :
				case GWeather.SpeedUnit.DEFAULT :
				default :
				return _("Unknown");
			}
		return 0;
		},

		loadConfig : function()
		{
		let that = this;
		this.settings = Convenience.getSettings(WEATHER_SETTINGS_SCHEMA);
		this.settingsC = this.settings.connect("changed",function(){that.status("**** SETTING CHANGED ("+arguments[1]+") ****");that.settingsChanged();});
		return 0;
		},

		loadGWeatherConfig : function()
		{
		let that = this;
		this.GWeatherSettings = Convenience.getSettings(WEATHER_GWEATHER_SETTINGS_SCHEMA);
		this.GWeatherSettingsC = this.GWeatherSettings.connect("changed",function(){that.status("**** GWEATHER SETTING CHANGED ("+arguments[1]+")  ****");that.settingsChanged();});
		return 0;
		},

		loadInterfaceConfig : function()
		{
		let that = this;
		this.InterfaceSettings = Convenience.getSettings("org.gnome.desktop.interface");
		this.InterfaceSettingsC = this.InterfaceSettings.connect("changed",function(){that.status("**** INTERFACE SETTING CHANGED ("+arguments[1]+")  ****");that.settingsChanged();});
		return 0;
		},

		settingsChanged : function()
		{
			if(this.variation("cities_names",true) || this.variation("symbolic_icon",true) || this.variation("position_in_panel",true))
			this.refreshUI();

			if(this.variation("clock_format",true) || this.variation("temperature_units",true) || this.variation("speed_units",true)
			|| this.variation("distance_units",true) || this.variation("pressure_units",true) || this.variation("text_in_panel",true)
			|| this.variation("comment_in_panel",true) || this.variation("wind_direction",true))
			this.refresh();

			if(this.variation("city_name"))
			{										this.status("Location has changed");
			this.restart();									this.status("Location changed to "+this.city_name);
			return 0;
			}

			if(this.variation("debug"))
			{
			this.restart();
			return 0;
			}
		return 0;
		},

		get clock_format()
		{
			if(!this.InterfaceSettings)
			this.loadInterfaceConfig();
		return this.InterfaceSettings.get_string("clock-format");
		},

		get temperature_units()
		{
			if(!this.GWeatherSettings)
			this.loadGWeatherConfig();
		return this.GWeatherSettings.get_enum(WEATHER_TEMPERATURE_UNIT_KEY);
		},

		set temperature_units(v)
		{
			if(!this.GWeatherSettings)
			this.loadGWeatherConfig();
		this.GWeatherSettings.set_enum(WEATHER_TEMPERATURE_UNIT_KEY,v);
		return 0;
		},

		get speed_units()
		{
			if(!this.GWeatherSettings)
			this.loadGWeatherConfig();
		return this.GWeatherSettings.get_enum(WEATHER_SPEED_UNIT_KEY);
		},

		set speed_units(v)
		{
			if(!this.GWeatherSettings)
			this.loadGWeatherConfig();
		this.GWeatherSettings.set_enum(WEATHER_SPEED_UNIT_KEY,v);
		return 0;
		},

		get wind_direction()
		{
			if(!this.settings)
			this.loadConfig();
		return this.settings.get_boolean(WEATHER_WIND_DIRECTION_KEY);
		},

		set wind_direction(v)
		{
			if(!this.settings)
			this.loadConfig();
		this.settings.set_boolean(WEATHER_WIND_DIRECTION_KEY,v);
		return 0;
		},

		get distance_units()
		{
			if(!this.GWeatherSettings)
			this.loadGWeatherConfig();
		return this.GWeatherSettings.get_enum(WEATHER_DISTANCE_UNIT_KEY);
		},

		set distance_units(v)
		{
			if(!this.GWeatherSettings)
			this.loadGWeatherConfig();
		this.GWeatherSettings.set_enum(WEATHER_SPEED_UNIT_KEY,v);
		return 0;
		},

		get pressure_units()
		{
			if(!this.GWeatherSettings)
			this.loadGWeatherConfig();
		return this.GWeatherSettings.get_enum(WEATHER_PRESSURE_UNIT_KEY);
		},

		set pressure_units(v)
		{
			if(!this.GWeatherSettings)
			this.loadGWeatherConfig();
		this.GWeatherSettings.set_enum(WEATHER_PRESSURE_UNIT_KEY,v);
		return 0;
		},

		get cities()
		{
			if(!this.settings)
			this.loadConfig();
		let cities = this.settings.get_value(WEATHER_CITY_KEY);
		cities = cities.deep_unpack();
			for(let i = 0; i < cities.length; i++)
			cities[i] = this.world.deserialize(cities[i]);
		return cities;
		},

		set cities(v)
		{
			if(!this.settings)
			this.loadConfig();
		let cities = v;
			for(let i = 0; i < cities.length; i++)
			cities[i] = cities[i].serialize();
		this.settings.set_value(WEATHER_CITY_KEY,new GLib.Variant('av', cities));
		return 0;
		},

		get cities_names()
		{
			if(!this.cities)
			return "";
			else
			return this.cities.join(", ");
		},

		get actual_city()
		{
			if(!this.settings)
			this.loadConfig();
		let a = this.settings.get_int(WEATHER_ACTUAL_CITY_KEY);
		let cities = this.cities;

		let l = cities.length-1;

			if(a < 0)
			a = 0;

			if(l < 0)
			l = 0;

			if(a > l)
			a = l;

		return a;
		},

		set actual_city(a)
		{
			if(!this.settings)
			this.loadConfig();
		let cities = this.cities;

		let l = cities.length-1;

			if(a < 0)
			a = 0;

			if(l < 0)
			l = 0;

			if(a > l)
			a = l;

		this.settings.set_int(WEATHER_ACTUAL_CITY_KEY,a);
		return 0;
		},

		get city()
		{
		let cities = this.cities;
		let city = cities[this.actual_city];
		return city;
		},

		set city(v)
		{
		let cities = this.cities;
		cities.splice(this.actual_city,1,v);
		this.cities = cities;
		return 0;
		},

		get city_name()
		{
			if(!this.city)
			return "";
			else
			return this.city.get_city_name();
		},

		get symbolic_icon()
		{
			if(!this.settings)
			this.loadConfig();
		return this.settings.get_boolean(WEATHER_USE_SYMBOLIC_ICONS_KEY) ? 1 : 0;
		},

		set symbolic_icon(v)
		{
			if(!this.settings)
			this.loadConfig();
		this.settings.set_boolean(WEATHER_USE_SYMBOLIC_ICONS_KEY,v);
		return 0;
		},

		get text_in_panel()
		{
			if(!this.settings)
			this.loadConfig();
		return this.settings.get_boolean(WEATHER_SHOW_TEXT_IN_PANEL_KEY);
		},

		set text_in_panel(v)
		{
			if(!this.settings)
			this.loadConfig();
		this.settings.set_boolean(WEATHER_SHOW_TEXT_IN_PANEL_KEY,v);
		return 0;
		},

		get position_in_panel()
		{
			if(!this.settings)
			this.loadConfig();
		return this.settings.get_enum(WEATHER_POSITION_IN_PANEL_KEY);
		},

		set position_in_panel(v)
		{
			if(!this.settings)
			this.loadConfig();
		this.settings.set_enum(WEATHER_POSITION_IN_PANEL_KEY,v);
		return 0;
		},

		get comment_in_panel()
		{
			if(!this.settings)
			this.loadConfig();
		return this.settings.get_boolean(WEATHER_SHOW_COMMENT_IN_PANEL_KEY);
		},

		set comment_in_panel(v)
		{
			if(!this.settings)
			this.loadConfig();
		this.settings.set_boolean(WEATHER_SHOW_COMMENT_IN_PANEL_KEY,v);
		return 0;
		},

		get debug()
		{
			if(!this.settings)
			this.loadConfig();
		return this.settings.get_boolean(WEATHER_DEBUG_EXTENSION);
		},

		set debug(v)
		{
			if(!this.settings)
			this.loadConfig();
		this.settings.set_boolean(WEATHER_DEBUG_EXTENSION,v);
		return 0;
		}
	});

let weather;

	function init()
	{
	// Use convenience translations //
	Convenience.initTranslations('gnome-shell-extension-weather');
	}

	function enable()
	{
	// Create weather //
	weather = new Weather();

	// Add weather to status area //
	Main.panel.addToStatusArea('weather', weather);
	}

	function disable()
	{
	// Stop weather //
	weather.stop();

	// Remove weather from status area //
	weather.destroy();
	}
