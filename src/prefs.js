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
const WEATHER_DEBUG_EXTENSION = 'debug-extension';			// Weather extension setting


// Soup session (see https://bugzilla.gnome.org/show_bug.cgi?id=661323#c64) (Simon Legner)
const _httpSession = new Soup.SessionAsync();
Soup.Session.prototype.add_feature.call(_httpSession, new Soup.ProxyResolverDefault());

let mCities = null;

const WeatherPrefsWidget = new GObject.Class(
{
Name: 'WeatherExtension.Prefs.Widget',
GTypeName: 'WeatherExtensionPrefsWidget',
Extends: Gtk.Box,

	_init: function(params)
	{
	this.parent(params);

	this.initWindow();

	this.initWeather();

	this.refreshUI();

	this.add(this.MainWidget);
	},

	Window : new Gtk.Builder(),

	initWindow : function()
	{
	let that = this;
	mCities = null;

	this.Window.add_from_file(EXTENSIONDIR+"/weather-settings.ui");

	this.MainWidget = this.Window.get_object("main-widget");
	this.treeview = this.Window.get_object("tree-treeview");
	this.liststore = this.Window.get_object("liststore");
	this.Iter = this.liststore.get_iter_first();

		this.Window.get_object("tree-toolbutton-add").connect("clicked",function()
		{
		that.addCity();
		});

		this.Window.get_object("tree-toolbutton-remove").connect("clicked",function()
		{
		that.removeCity();
		});

		this.Window.get_object("treeview-selection").connect("changed",function(selection)
		{
		that.selectionChanged(selection);
		});

	this.treeview.set_model(this.liststore);

	let column = new Gtk.TreeViewColumn()
	this.treeview.append_column(column);

	let renderer = new Gtk.CellRendererText();
	column.pack_start(renderer,null);

		column.set_cell_data_func(renderer,function()
		{
		arguments[1].markup = arguments[2].get_value(arguments[3],0);
		});

	this.initConfigWidget();
	this.addLabel(_("Temperature Unit"));
	this.addComboBox(["",_("Default"),"K","\u00b0C","\u00b0F"],"temperature_units");
	this.addLabel(_("Wind Speed Unit"));
	this.addComboBox(["",_("Default"),"m/s","km/h","mph","knots","Beaufort"],"speed_units");
	this.addLabel(_("Pressure Unit"));
	this.addComboBox(["",_("Default"),"kPa","hPa","mb","mmHg","inHg","atm"],"pressure_units");
	this.addLabel(_("Distance Unit"));
	this.addComboBox(["",_("Default"),"m","km","miles"],"distance_units");
	this.addLabel(_("Position in Panel"));
	this.addComboBox([_("Center"),_("Right"),_("Left")],"position_in_panel");
	this.addLabel(_("Symbolic Icons"));
	this.addSwitch("icon_type");
	this.addLabel(_("Temperature in Panel"));
	this.addSwitch("text_in_panel");
	this.addLabel(_("Conditions in Panel"));
	this.addSwitch("comment_in_panel");
	this.addLabel(_("Debug the extension"));
	this.addSwitch("debug");
	},

	initWeather : function()
	{
	this.world = new GWeather.Location.new_world(false);
	},

	refreshUI : function()
	{
	this.MainWidget = this.Window.get_object("main-widget");
	this.treeview = this.Window.get_object("tree-treeview");
	this.liststore = this.Window.get_object("liststore");
	this.Iter = this.liststore.get_iter_first();

	this.Window.get_object("tree-toolbutton-remove").sensitive = Boolean(this.city.length);

		if(mCities != this.city)
		{
			if(typeof this.liststore != "undefined")
			this.liststore.clear();

			if(this.city.length > 0)
			{
			let city = String(this.city).split(" && ");

				if(city && typeof city == "string")
				city = [city];

			let current = this.liststore.get_iter_first();

				for(let i in city)
				{
				current = this.liststore.append();
				this.liststore.set_value(current, 0, this.extractLocation(city[i]));
				}
			}

		mCities = this.city;
		}

	this.changeSelection();

	let config = this.configWidgets;
		for(let i in config)
			if(config[i][0].active != this[config[i][1]])
			config[i][0].active = this[config[i][1]];
	},

	initConfigWidget : function()
	{
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
		cf.append_text(a[i]);
	cf.active = this[b];
	cf.connect("changed",function(){that[b] = arguments[0].active;});
	this.right_widget.attach(cf, this.x[0],this.x[1], this.y[0],this.y[1],0,0,0,0);
	this.inc();
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
	let a = select.get_selected_rows(this.liststore)[0][0];

		if(typeof a != "undefined")
			if(this.actual_city != parseInt(a.to_string()))
			this.actual_city = parseInt(a.to_string());
	},

	addCity : function()
	{
	let that = this;
	let textDialog = _("Name of the city");
	let dialog = new Gtk.Dialog({title : ""});
	let entry = new GWeather.LocationEntry.new(this.world);
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
				if(that.city)
				that.city = that.city+" && "+location.get_code()+">"+location.get_city_name();
				else
				that.city = location.get_code()+">"+location.get_city_name();
			}
		dialog.destroy();
		return 0;
		});

	dialog.show_all();
	},

	removeCity : function()
	{
	let that = this;
	let city = this.city.split(" && ");
		if(!city.length)
		return 0;
	let ac = this.actual_city;
	let textDialog = _("Remove %s ?").replace("%s",this.extractLocation(city[ac]));
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
				if(city.length == 0)
				city = [];

				if(city.length > 0 && typeof city != "object")
				city = [city];

				if(city.length > 0)
				city.splice(ac,1);

				if(city.length > 1)
				that.city = city.join(" && ");
				else if(city[0])
				that.city = city[0];
				else
				that.city = "";
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
		if(arguments[0])
		path = arguments[0];
	path = new Gtk.TreePath.new_from_string(String(path));
	this.treeview.get_selection().select_path(path);
	},

	loadJsonAsync : function(url, fun, id)
	{
        let here = this;
        let message = new Soup.Message.new('GET', url);

		if(typeof this.asyncSession == "undefined")
		this.asyncSession = {};

		if(typeof this.asyncSession[id] != "undefined" && this.asyncSession[id])
		{
		_httpSession.abort();
		this.asyncSession[id] = 0;
		}

		this.asyncSession[id] = 1;
		_httpSession.queue_message(message, function(_httpSession, message)
		{
		here.asyncSession[id] = 0;
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
		return 0;
		});
	},

	loadConfig : function()
	{
	let that = this;
   	this.Settings = Convenience.getSettings(WEATHER_SETTINGS_SCHEMA);	
	this.Settings.connect("changed", function(){that.refreshUI();});
	},

	loadGWeatherConfig : function()
	{
	let that = this;
	this.GWeatherSettings = Convenience.getSettings(WEATHER_GWEATHER_SETTINGS_SCHEMA);
	this.GWeatherSettingsC = this.GWeatherSettings.connect("changed",function(){that.refreshUI();});
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
	return this.Settings.get_string(WEATHER_CITY_KEY);
	},

	set city(v)
	{
		if(!this.Settings)
		this.loadConfig();
	this.Settings.set_string(WEATHER_CITY_KEY,v);
	},

	get actual_city()
	{
		if(!this.Settings)
		this.loadConfig();
	let a = this.Settings.get_int(WEATHER_ACTUAL_CITY_KEY);
	let citys = this.city.split(" && ");

		if(citys && typeof citys == "string")
		citys = [citys];

	let l = citys.length-1;

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
	let citys = this.city.split(" && ");

		if(citys && typeof citys == "string")
		citys = [citys];

	let l = citys.length-1;

		if(a < 0)
		a = 0;

		if(l < 0)
		l = 0;

		if(a > l)
		a = l;

	this.Settings.set_int(WEATHER_ACTUAL_CITY_KEY,a);
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
	},

	extractLocation : function(a)
	{
		if(a.search(">") == -1)
		return _("Invalid city");
	return a.split(">")[1];
	},

	extractCode : function(a)
	{
		if(a.search(">") == -1)
		return 0;
	return a.split(">")[0];
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
