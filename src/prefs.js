/*
 *
 *  Weather extension for GNOME Shell preferences 
 *  - Creates a widget to set the preferences of the weather extension
 *
 * Copyright (C) 2012
 *     Canek Peláez <canek@ciencias.unam.mx>,
 *     Christian METZLER <neroth@xeked.com>,
 *
 * This file is part of gnome-shell-extension-weather.
 *
 * gnome-shell-extension-weather is free software: you can
 * redistribute it and/or modify it under the terms of the GNU
 * General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option)
 * any later version.
 *
 * gnome-shell-extension-weather is distributed in the hope that it
 * will be useful, but WITHOUT ANY WARRANTY; without even the
 * implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR
 * PURPOSE.  See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with gnome-shell-extension-weather.  If not, see
 * <http://www.gnu.org/licenses/>.
 *
 */

const Gtk = imports.gi.Gtk;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const GtkBuilder = Gtk.Builder;
const Gio = imports.gi.Gio;
const Gettext = imports.gettext.domain('gnome-shell-extension-weather');
const _ = Gettext.gettext;
const Soup = imports.gi.Soup;
const GWeather = imports.gi.GWeather;

const Lang = imports.lang;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const EXTENSIONDIR = Me.dir.get_path();

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

const WeatherPrefsWidget = new GObject.Class(
{
Name: 'WeatherExtension.Prefs.Widget',
GTypeName: 'WeatherExtensionPrefsWidget',
Extends: Gtk.Box,

	_init: function(params)
	{
	this.parent(params);

	this.initWindow();

	this.refreshUI();

	this.add(this.MainWidget);
	},

	status : function()
	{
		if(typeof __logfile__ == "undefined")
		{
		__logfile__ = Gio.file_new_for_path(GLib.get_user_cache_dir()+"/weather-extension-prefs.log");
			if(__logfile__.query_exists(null))
			__logfile__.delete(null);
		}

		if(!this.debug)
		return 0;

	let fileOutput = __logfile__.append_to(Gio.FileCreateFlags.PRIVATE,null);
		if(!arguments[0])
		fileOutput.write("\n",null);
		else
		fileOutput.write("["+new Date().toString()+"] "+arguments[0]+"\n",null);
	fileOutput.close(null);
	return 0;
	},

	Window : new Gtk.Builder(),

	world : GWeather.Location.new_world(false),

	initWindow : function()
	{												this.status("Init window");
	let that = this;
	mCities = [];

	this.Window.add_from_file(EXTENSIONDIR+"/weather-settings.ui");					this.status("Weather Settings UI loaded");

	this.MainWidget = this.Window.get_object("main-widget");
	this.treeview = this.Window.get_object("tree-treeview");
	this.liststore = this.Window.get_object("liststore");
	this.Iter = this.liststore.get_iter_first();							this.status("UI object inited");

		this.Window.get_object("tree-toolbutton-add").connect("clicked",function()
		{
		that.addCity();
		});											this.status("Add button connected");

		this.Window.get_object("tree-toolbutton-remove").connect("clicked",function()
		{
		that.removeCity();
		});											this.status("Remove button connected");

		this.Window.get_object("treeview-selection").connect("changed",function(selection)
		{
		that.selectionChanged(selection);
		});											this.status("Treeview selection connected");

	this.treeview.set_model(this.liststore);							this.status("Treeview liststore added");

	let column = new Gtk.TreeViewColumn()
	this.treeview.append_column(column);								this.status("Treeview column added");

	let renderer = new Gtk.CellRendererText();
	column.pack_start(renderer,null);								this.status("Column cell renderer text added");

		column.set_cell_data_func(renderer,function()
		{
		arguments[1].markup = arguments[2].get_value(arguments[3],0);
		});

	this.initConfigWidget();									this.status("Inited config widget");
	this.addLabel(_("Temperature Unit"));
	this.addComboBox([0,0,"K","\u00b0C","\u00b0F"],"temperature_units");
	this.addLabel(_("Wind Speed Unit"));
	this.addComboBox([0,0,"m/s","km/h","mph","knots","Beaufort"],"speed_units");
	this.addLabel(_("Pressure Unit"));
	this.addComboBox([0,0,"kPa","hPa","mb","mmHg","inHg","atm"],"pressure_units");
	this.addLabel(_("Distance Unit"));
	this.addComboBox([0,0,"m","km","miles"],"distance_units");
	this.addLabel(_("Position in Panel"));
	this.addComboBox([_("Center"),_("Right"),_("Left")],"position_in_panel");
	this.addLabel(_("Wind Direction by Arrows"));
	this.addSwitch("wind_direction");
	this.addLabel(_("Symbolic Icons"));
	this.addSwitch("icon_type");
	this.addLabel(_("Temperature in Panel"));
	this.addSwitch("text_in_panel");
	this.addLabel(_("Conditions in Panel"));
	this.addSwitch("comment_in_panel");
	this.addLabel(_("Debug the extension"));
	this.addSwitch("debug");									this.status("All widget added");
	},

	refreshUI : function()
	{												this.status("Refresh UI");
	this.MainWidget = this.Window.get_object("main-widget");
	this.treeview = this.Window.get_object("tree-treeview");
	this.liststore = this.Window.get_object("liststore");
	this.Iter = this.liststore.get_iter_first();

	let cities = this.city;

	this.Window.get_object("tree-toolbutton-remove").sensitive = Boolean(cities.length);		this.status("Remove button sensitivity added");

	let citiesVariation = !!(cities.length - mCities.length);

		if(!citiesVariation)
			for(let i = 0; i < cities.length; i++)
			{
				if(!cities[i].equal(mCities[i]))
				citiesVariation = true;
			}

		if(citiesVariation)
		{											this.status("Refresh City list");
			if(typeof this.liststore != "undefined")
			{										this.status("Clearing liststore");
			this.liststore.clear();								this.status("Liststore cleared");
			}

			if(cities.length > 0)
			{										this.status(cities.length+" cities to add in the liststore");
			let current = this.liststore.get_iter_first();

				for(let i = 0; i < cities.length; i++)
				{
				current = this.liststore.append();
				let city = cities[i];
				this.liststore.set_value(current, 0, city.get_city_name());		this.status((i+1)+") "+city.get_city_name()+" added");
				}
			}

		mCities = cities;									this.status("City list refreshed");
		}

	this.changeSelection();

	let config = this.configWidgets;								this.status("Setting the widget");
		for(let i in config)
			if(typeof config[i][0].active_id != "undefined" && config[i][0].active_id != this[config[i][1]])
			{										this.status("Change "+config[i][1]+" from "+config[i][0].active_id+" to "+this[config[i][1]]+" (active_id)");
			config[i][0].active_id = String(this[config[i][1]]);				this.status(config[i][1]+" changed to "+this[config[i][1]]+" (active_id)");
			}
			else if(typeof config[i][0].active_id == "undefined" && config[i][0].active != this[config[i][1]])
			{										this.status("Change "+config[i][1]+" from "+config[i][0].active+" to "+this[config[i][1]]);
			config[i][0].active = this[config[i][1]];					this.status(config[i][1]+" changed to "+this[config[i][1]]);
			}										this.status("UI refreshed");
	},

	initConfigWidget : function()
	{
	this.configWidgets.splice(0, this.configWidgets.length);
	this.inc(1);
	let a = this.Window.get_object("right-widget-table");
	a.visible = 1;
	a.can_focus = 0;
	this.right_widget = a;
	},

	x : [0,1],

	y : [0,1],

	configWidgets : [],

	inc : function()
	{
		if(arguments[0])
		{
		this.x[0] = 0;
		this.x[1] = 1;
		this.y[0] = 0;
		this.y[1] = 1;
		return 0;
		}

		if(this.x[0] == 1)
		{
		this.x[0] = 0;
		this.x[1] = 1;
		this.y[0] += 1;
		this.y[1] += 1;
		return 0;
		}
		else
		{
		this.x[0] += 1;
		this.x[1] += 1;
		return 0;
		}
	},

	addLabel : function(text)
	{
	let l = new Gtk.Label({label:text,xalign:0});
	l.visible = 1;
	l.can_focus = 0;
	this.right_widget.attach(l, this.x[0],this.x[1], this.y[0],this.y[1],0,0,0,0);
	this.inc();
	},

	addComboBox : function(a,b)
	{
	let that = this;
	let cf = new Gtk.ComboBoxText();
	this.configWidgets.push([cf,b]);
	cf.visible = 1;
	cf.can_focus = 0;
	cf.width_request = 100;
		for(let i in a)
		{
			if(a[i] != 0)
			cf.append(i, a[i]);
		}
	cf.active_id = String(this[b]);
	cf.connect("changed",function(){try{that[b] = Number(arguments[0].get_active_id());}catch(e){that.status(e);}});
	this.right_widget.attach(cf, this.x[0],this.x[1], this.y[0],this.y[1],0,0,0,0);
	this.inc();											this.status("Added comboBox("+(this.configWidgets.length-1)+") "+b+" active_id : "+this[b]);
	return 0;
	},

	addSwitch : function(a)
	{
	let that = this;
	let sw = new Gtk.Switch();
	this.configWidgets.push([sw,a]);
	sw.visible = 1;
	sw.can_focus = 0;
	sw.active = this[a];
	sw.connect("notify::active",function(){that[a] = arguments[0].active;});
	this.right_widget.attach(sw, this.x[0],this.x[1], this.y[0],this.y[1],0,0,0,0);
	this.inc();
	},

	selectionChanged : function(select)
	{
	let a = select.get_selected_rows(this.liststore)[0][0];					this.status("Selection changed to "+a.to_string());

		if(typeof a != "undefined")
			if(this.actual_city != parseInt(a.to_string()))
			{
			this.actual_city = parseInt(a.to_string());				this.status("Actual city changed to "+this.actual_city);
			}
	},

	addCity : function()
	{
	let that = this;
	let textDialog = _("Name of the city");
	let dialog = new Gtk.Dialog({title : ""});
	let entry = GWeather.LocationEntry.new(this.world);
	entry.margin_top = 12;
	entry.margin_bottom = 12;
	let label = new Gtk.Label({label : textDialog});

	dialog.set_border_width(12);
	dialog.set_modal(1);
	dialog.set_resizable(0);
	//dialog.set_transient_for(***** Need parent Window *****);

	dialog.add_button(Gtk.STOCK_CANCEL, 0);
	let d = dialog.add_button(Gtk.STOCK_OK, 1);

	d.set_can_default(true);
	d.sensitive = 0;

	dialog.set_default(d);
	entry.activates_default = true;

		let testLocation = function(location)
		{
		d.sensitive = 0;
			if(entry.get_location())
			d.sensitive = 1;
		return 0;
		};

	entry.connect("changed",testLocation);

	let dialog_area = dialog.get_content_area();
	dialog_area.pack_start(label,0,0,0);
	dialog_area.pack_start(entry,0,0,0);
		dialog.connect("response",function(w, response_id)
		{
		let location = entry.get_location();
		   	if(response_id && location)
			{
			let locations = that.city;
			locations.push(location);
			that.city = locations;
			}
		dialog.destroy();
		return 0;
		});

	dialog.show_all();
	},

	removeCity : function()
	{
	let that = this;
	let locations = this.city;
	let city = locations[this.actual_city];
		if(!locations.length)
		return 0;
	let ac = this.actual_city;
	let textDialog = _("Remove %s ?").replace("%s",city.get_city_name());
	let dialog = new Gtk.Dialog({title : ""});
	let label = new Gtk.Label({label : textDialog});
	label.margin_bottom = 12;

	dialog.set_border_width(12);
	dialog.set_modal(1);
	dialog.set_resizable(0);
	//dialog.set_transient_for(***** Need parent Window *****);

	dialog.add_button(Gtk.STOCK_NO, 0);
	let d = dialog.add_button(Gtk.STOCK_YES, 1);

	d.set_can_default(true);
	dialog.set_default(d);

	let dialog_area = dialog.get_content_area();
	dialog_area.pack_start(label,0,0,0);
		dialog.connect("response",function(w, response_id)
		{
		   	if(response_id)
			{
				for(let i = 0; i < locations.length; i++)
				{
					if(locations[i].equal(city))
					{
					locations.splice(i, 1);
					break;
					}
				}
				that.city = locations;
			}
		dialog.destroy();
		return 0;
		});

	dialog.show_all();
	return 0;
	},

	changeSelection : function()
	{
	let path = this.actual_city;
		if(typeof arguments[0] != "undefined")
		path = arguments[0];
										this.status("Change selection to "+path);
	path = Gtk.TreePath.new_from_string(String(path));
	this.treeview.get_selection().select_path(path);
	},

	loadConfig : function()
	{
	let that = this;
   	this.Settings = Convenience.getSettings(WEATHER_SETTINGS_SCHEMA);	
	this.Settings.connect("changed", function(){that.status(0); that.refreshUI();});
	},

	loadGWeatherConfig : function()
	{
	let that = this;
	this.GWeatherSettings = Convenience.getSettings(WEATHER_GWEATHER_SETTINGS_SCHEMA);
	this.GWeatherSettingsC = this.GWeatherSettings.connect("changed",function(){that.status(0); that.refreshUI();});
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
	this.GWeatherSettings.set_enum(WEATHER_DISTANCE_UNIT_KEY,v);
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
	},

	get city()
	{
		if(!this.Settings)
		this.loadConfig();
	let cities = this.Settings.get_value(WEATHER_CITY_KEY);
	cities = cities.deep_unpack();
		for(let i = 0; i < cities.length; i++)
		cities[i] = this.world.deserialize(cities[i]);
	return cities;
	},

	set city(v)
	{
		if(!this.Settings)
		this.loadConfig();
	let cities = v;
		for(let i = 0; i < cities.length; i++)
		cities[i] = cities[i].serialize();
	this.Settings.set_value(WEATHER_CITY_KEY,new GLib.Variant('av', cities));
	},

	get actual_city()
	{
		if(!this.Settings)
		this.loadConfig();
	let a = this.Settings.get_int(WEATHER_ACTUAL_CITY_KEY);
	let cities = this.city;

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
		if(!this.Settings)
		this.loadConfig();
	let cities = this.city;

	let l = cities.length-1;

		if(a < 0)
		a = 0;

		if(l < 0)
		l = 0;

		if(a > l)
		a = l;

	this.Settings.set_int(WEATHER_ACTUAL_CITY_KEY,a);
	},

	get wind_direction()
	{
		if(!this.Settings)
		this.loadConfig();
	return this.Settings.get_boolean(WEATHER_WIND_DIRECTION_KEY);
	},

	set wind_direction(v)
	{
		if(!this.Settings)
		this.loadConfig();
	return this.Settings.set_boolean(WEATHER_WIND_DIRECTION_KEY,v);
	},

	get icon_type()
	{
		if(!this.Settings)
		this.loadConfig();
	return this.Settings.get_boolean(WEATHER_USE_SYMBOLIC_ICONS_KEY);
	},

	set icon_type(v)
	{
		if(!this.Settings)
		this.loadConfig();
	this.Settings.set_boolean(WEATHER_USE_SYMBOLIC_ICONS_KEY,v);
	},

	get text_in_panel()
	{
		if(!this.Settings)
		this.loadConfig();
	return this.Settings.get_boolean(WEATHER_SHOW_TEXT_IN_PANEL_KEY);
	},

	set text_in_panel(v)
	{
		if(!this.Settings)
		this.loadConfig();
	this.Settings.set_boolean(WEATHER_SHOW_TEXT_IN_PANEL_KEY,v);
	},

	get position_in_panel()
	{
		if(!this.Settings)
		this.loadConfig();
	return this.Settings.get_enum(WEATHER_POSITION_IN_PANEL_KEY);
	},

	set position_in_panel(v)
	{
		if(!this.Settings)
		this.loadConfig();
	this.Settings.set_enum(WEATHER_POSITION_IN_PANEL_KEY,v);
	},

	get comment_in_panel()
	{
		if(!this.Settings)
		this.loadConfig();
	return this.Settings.get_boolean(WEATHER_SHOW_COMMENT_IN_PANEL_KEY);
	},

	set comment_in_panel(v)
	{
		if(!this.Settings)
		this.loadConfig();
	this.Settings.set_boolean(WEATHER_SHOW_COMMENT_IN_PANEL_KEY,v);
	},

	get debug()
	{
		if(!this.Settings)
		this.loadConfig();
	return this.Settings.get_boolean(WEATHER_DEBUG_EXTENSION);
	},

	set debug(v)
	{
		if(!this.Settings)
		this.loadConfig();
	this.Settings.set_boolean(WEATHER_DEBUG_EXTENSION,v);
	}
});

function init()
{
Convenience.initTranslations('gnome-shell-extension-weather');
}

function buildPrefsWidget()
{
let widget = new WeatherPrefsWidget();
widget.show_all();
return widget;
}
