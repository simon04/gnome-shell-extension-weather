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
const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const PopupMenu = imports.ui.popupMenu;
const Gettext = imports.gettext.domain('gnome-shell-extension-weather');
const _ = Gettext.gettext;
const Util = imports.misc.util;
const Gio = imports.gi.Gio;
const EXTENSIONDIR = Me.dir.get_path();

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
		this.variation("cities");
		this.variation("city");
		this.variation("symbolic_icon");
		this.variation("text_in_panel");
		this.variation("position_in_panel");
		this.variation("comment_in_panel");
		this.variation("debug");									this.status("Initialized settings variation");

		this.initWeather();										this.status("Initialized GWeather");

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
			this.logfile = Gio.file_new_for_path(EXTENSIONDIR+"/weather.log");
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

			if(typeof this.UI != "undefined" && this.UI.menuConditions && arguments[0])
			{
	    		this.UI.menuConditions.text = arguments[0];
				if(arguments[1])
				this.UI.menuConditions.icon_name = arguments[1];
			}
		return 0;
		},

		start : function()
		{												this.status("Starting Weather");
		let that = this;
		let code = this.extractCode(this.city);
		this.location = this.world.find_by_station_code(code);						this.status("Location ("+this.location.get_city_name()+") loaded");

		this.info = new GWeather.Info.new(this.location,GWeather.ForecastType.LIST);			this.status("Information loaded");
		this.infoC = this.info.connect("updated",function(){that.refresh();that.status(0);});		this.status("Information connection started");

		this.loadConfig();
		this.loadGWeatherConfig();
		this.refreshUI();										this.status("Weather started"); this.status(0);
		return 0;
		},

		stop : function()
		{												this.status("Stopping Weather");
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
			}											this.status("Stopped"); this.status(0);
		return 0;
		},

		restart : function()
		{
		this.stop();
		this.start();
		return 0;
		},

		refresh : function()
		{												this.status("Refreshing");
		let that = this;
			if(!this.info.is_valid())
			{
			this.rebuildCurrentItem(0);
			this.rebuildForecastItem(0);								this.status("Informations is invalid");
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
				conditions += " / ";

				if(that.text_in_panel)
				conditions += info.get_temp();

			return conditions;
			};

		let tempUnitVar = this.variation("temperature_units");
		let speedUnitVar = this.variation("speed_units");
		let distUnitVar = this.variation("distance_units");
		let presUnitVar = this.variation("pressure_units");
		let cityVar = this.variation("city");
		let textInPanelVar = this.variation("text_in_panel");
		let commentInPanelVar = this.variation("comment_in_panel");					this.status("Variation readed");

		let first = false;
			if(typeof this.build == "undefined")
			{
			first = true;										this.status("First build");
			this.build = this.info.get_update();
			this.variation("build");
			}

		let update = false;
			if(this.variation("build"))
			{
			update = true;										this.status("Update information");
			}

		let fuc = (first || update || cityVar);
		let di_up = (first)?"displayed":"updated";

			if(fuc)
			{
			this.forecast = this.info.get_forecast_list();						this.status(this.forecast.length+" forecast");
			this.rebuildCurrentItem(1);
			this.rebuildForecastItem(this.forecast.length);

			this.UI.menuIcon.icon_name = this.UI.currentIcon.icon_name = this.icon_type(this.info.get_icon_name());
			this.UI.currentSunrise.text = this.info.get_sunrise();
			this.UI.currentSunset.text = this.info.get_sunset();
			this.UI.currentBuild.text = this.build;
			this.UI.currentLocation.text = this.location.get_city_name();
			this.UI.currentHumidity.text = this.info.get_humidity();				this.status("Basics informations "+di_up);
			}

			if(fuc || tempUnitVar)
			{
			this.UI.currentSummary.text = getConditions(this.info)+" / "+this.info.get_temp();
			this.UI.menuConditions.text = getMenuConditions(this.info);
			this.UI.currentTemperature.text = this.info.get_apparent();
			this.UI.currentDew.text = this.info.get_dew();						this.status("Temperatures informations "+di_up);
			}

			if(fuc || speedUnitVar)
			{
			this.UI.currentWind.text = _('Wind:')+' '+this.info.get_wind();				this.status("Wind information "+di_up);
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

			for(let i in this.forecast)
			{
				if(fuc)
				{
				this.UI.forecastItems[i].icon.icon_name = this.icon_type(this.forecast[i].get_icon_name());
				this.UI.forecastItems[i].day.text = this.forecast[i].get_update();		this.status("Basics forecast ("+i+") informations "+di_up);
				}

				if(fuc || tempUnitVar)
				{
				this.UI.forecastItems[i].summary.text = getConditions(this.forecast[i])+" / "+this.forecast[i].get_temp();
				this.UI.forecastItems[i].temp_min.text = "\u2193 "+this.forecast[i].get_temp_min();
				this.UI.forecastItems[i].temp_max.text = "\u2191 "+this.forecast[i].get_temp_max(); this.status("Temperatures forecast ("+i+") informations "+di_up);
				}
			}											this.status("Refreshed");
		return 0;
		},

		initWeather : function()
		{
		this.world = new GWeather.Location.new_world(false);
		return 0;
		},

		initUI : function()
		{
		this.UI = {};

		this.UI.menuConditions = new St.Label({ text: _('Weather') });					this.status("UI.menuCoditions created");

		// Panel icon
		this.UI.menuIcon = new St.Icon(
		{
		icon_name: 'view-refresh'+this.icon_type(),
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

		this.UI.current = new St.Bin({ style_class: 'current' });					this.status("UI.current created");
		this.UI.forecast = new St.Bin({ style_class: 'forecast'});					this.status("UI.forecast created");
		this.menu.addActor(this.UI.current);								this.status("UI.current added to menu");

		let item;

		item = new PopupMenu.PopupSeparatorMenuItem();
		this.menu.addMenuItem(item);									this.status("Added separator");

		this.menu.addActor(this.UI.forecast);								this.status("UI.forecast added to menu");

		item = new PopupMenu.PopupSeparatorMenuItem();
		this.menu.addMenuItem(item);									this.status("Added separator");

		this.UI.locationSelector = new PopupMenu.PopupSubMenuMenuItem(_("Locations"));			this.status("UI.locationSelector created");
		this.menu.addMenuItem(this.UI.locationSelector);						this.status("UI.locationSelector added to menu");
		this.rebuildLocationSelectorItem();								this.status("Location selector builded");

		item = new PopupMenu.PopupMenuItem(_("Weather Settings"));
		item.connect('activate', Lang.bind(this, this.onPreferencesActivate));
		this.menu.addMenuItem(item);									this.status("Preference button added to menu");

		this.rebuildCurrentItem(0);
		this.rebuildForecastItem(0);									this.status("UI initialized");
		return 0;
		},

		refreshUI : function()
		{												this.status("Refresh UI");
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

			if(this.variation("cities") || this.variation("city",true))
			{
			this.rebuildLocationSelectorItem();									this.status("Location selector rebuilded");
			}

			if(this.variation("symbolic_icon"))
			{
			this.UI.menuConditions.icon_name = this.icon_type(this.UI.menuConditions.icon_name);			this.status("Rebuilded menu icon");

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
		cities = cities.split(" && ");
			if(cities && typeof cities == "string")
			cities = [cities];
			if(!cities[0])
			return 0;

			for(let i = 0; cities.length > i; i++)
			{
			item = new PopupMenu.PopupMenuItem(this.extractLocation(cities[i]));
			item.location = i;

				if(i == this.actual_city)
				item.setShowDot(true);

			this.UI.locationSelector.menu.addMenuItem(item);

				item.connect('activate', function(actor,event)
				{
				that.actual_city = actor.location;
				});
			}

			if (cities.length == 1)
			this.UI.locationSelector.actor.hide();
			else
			this.UI.locationSelector.actor.show();

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

		this.UI.currentLocation = new St.Label({ text: _('Please wait') });

		// The summary of the current weather
		this.UI.currentSummary = new St.Label({
		text: _('Loading ...'),
		style_class: 'weather-current-summary'
		});

		this.UI.currentWind = new St.Label({ text: _('Wind:')+' -' });

		let bb = new St.BoxLayout({
		vertical: true,
		style_class: 'weather-current-summarybox'
		});
		bb.add_actor(this.UI.currentLocation);
		bb.add_actor(this.UI.currentSummary);
		bb.add_actor(this.UI.currentWind);

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
		this.UI.currentDew = new St.Label({ text: '-' });
		this.UI.currentVisibility = new St.Label({ text: '-' });
		this.UI.currentHumidity = new St.Label({ text:  '-' });
		this.UI.currentPressure = new St.Label({ text: '-' });

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
		rb_values.add_actor(this.UI.currentTemperature);
		rb_captions.add_actor(new St.Label({text: _('Dew:')}));
		rb_values.add_actor(this.UI.currentDew);
		rb_captions.add_actor(new St.Label({text: _('Visibility:')}));
		rb_values.add_actor(this.UI.currentVisibility);
		rb_captions.add_actor(new St.Label({text: _('Humidity:')}));
		rb_values.add_actor(this.UI.currentHumidity);
		rb_captions.add_actor(new St.Label({text: _('Pressure:')}));
		rb_values.add_actor(this.UI.currentPressure);

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
			if(!n)
			{
			this.UI.forecast.set_child(new St.Label({ text: _('No forecast information') }));
			return 0;
			}

		this.destroyForecast();

		this.UI.forecastItems = [];
		this.UI.forecastBox = new St.BoxLayout({style_class: 'weather-forecasts', vertical: true});
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
			forecastWeather.summary = new St.Label({
			style_class: 'weather-forecast-summary'
			});

			let daysum = new St.BoxLayout({
			vertical: true,
			style_class: 'weather-forecast-daysum'
			});
			daysum.add_actor(forecastWeather.day);
			daysum.add_actor(forecastWeather.summary);

			let daysumbox = new St.Bin({
			style_class: 'weather-forecast-daysum-box'
			});
			daysumbox.set_child(daysum);

			let bb = new St.BoxLayout({
			vertical: true,
			style_class: 'weather-forecast-box'
			});
			bb.add_actor(iconminmaxbox);
			bb.add_actor(daysumbox);

			forecastWeather.box = bb;

			this.UI.forecastItems[i] = forecastWeather;
			}

		let column = Math.ceil(n/4);
		let f = 0;
		let topPadding = "";

			if(n >= 0)
				for(let i = 0; i < column; i++)
				{
				let box = new St.Bin({style_class: topPadding});
				let columnBox = new St.BoxLayout();
				box.set_child(columnBox);

					for(let j = 0; this.UI.forecastItems[f]; j++)
					{
						if(j >= 4)
						break;
														this.status("Adding forecast to column "+i+", line "+j);
					columnBox.add_actor(this.UI.forecastItems[f].box);
					f++;
					}
				this.UI.forecastBox.add_actor(box);
				topPadding = "weather-forecast-box-addTopPadding";
				}
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

		extractCode : function()
		{
			if(!arguments[0])
			return 0;

			if(arguments[0].search(">") == -1)
			return 0;
		return arguments[0].split(">")[0];
		},

		icon_type : function(icon_name)
		{
			if(!icon_name)
				if(this.symbolic_icon)
				return "-symbolic";
				else
				return "";

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

		loadConfig : function()
		{
		let that = this;
		this.settings = Convenience.getSettings(WEATHER_SETTINGS_SCHEMA);
		this.settingsC = this.settings.connect("changed",function(){that.status("**** SETTING CHANGED ****");that.settingsChanged();});
		return 0;
		},

		loadGWeatherConfig : function()
		{
		let that = this;
		this.GWeatherSettings = Convenience.getSettings(WEATHER_GWEATHER_SETTINGS_SCHEMA);
		this.GWeatherSettingsC = this.GWeatherSettings.connect("changed",function(){that.status("**** GWEATHER SETTING CHANGED ****");that.settingsChanged();});
		return 0;
		},

		settingsChanged : function()
		{
			if(this.variation("cities",true) || this.variation("symbolic_icon",true) || this.variation("position_in_panel",true))
			this.refreshUI();

			if(this.variation("temperature_units",true) || this.variation("speed_units",true) || this.variation("distance_units",true) 
			|| this.variation("pressure_units",true) || this.variation("text_in_panel",true) || this.variation("comment_in_panel",true))
			this.refresh();

		let oldCode = String(this.location.get_code());
		let newCode = String(this.extractCode(this.city));
			if(newCode != oldCode)
			{										this.status("Location has changed ("+oldCode+" => "+newCode+")");
			this.restart();									this.status("Location changed to "+this.location.get_city_name());
			return 0;
			}

			if(this.variation("debug"))
			{
			this.restart();
			return 0;
			}
		return 0;
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
		return this.settings.get_string(WEATHER_CITY_KEY);
		},

		set cities(v)
		{
			if(!this.settings)
			this.loadConfig();
		this.settings.set_string(WEATHER_CITY_KEY,v);
		return 0;
		},

		get actual_city()
		{
			if(!this.settings)
			this.loadConfig();
		var a = this.settings.get_int(WEATHER_ACTUAL_CITY_KEY);
		var b = a;
		var cities = this.cities.split(" && ");

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

		set actual_city(a)
		{
			if(!this.settings)
			this.loadConfig();
		var cities = this.cities.split(" && ");

			if(typeof cities != "object")
			cities = [cities];

		var l = cities.length-1;

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
		let cities = cities.split(" && ");
			if(cities && typeof cities == "string")
			cities = [cities];
			if(!cities[0])
			return "";
		cities = cities[this.actual_city];
		return cities;
		},

		set city(v)
		{
		let cities = this.cities;
		cities = cities.split(" && ");
			if(cities && typeof cities == "string")
			cities = [cities];
			if(!cities[0])
			cities = [];
		cities.splice(this.actual_city,1,v);
		cities = cities.join(" && ");
			if(typeof cities != "string")
			cities = cities[0];
		this.cities = cities;
		return 0;
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
