
// Weather extension for Gnome shell
// ----------
// - Displays a small weather information on the top panel
// - On click, gives a popup with details about the weather
// ----------
// Copyright (C) 2011, Timur Kristóf <venemo@msn.com>
// - Licensed under the terms of the GPL license

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

const Util = imports.misc.util;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Calendar = imports.ui.calendar;


function WeatherMenuButton() {
    this._init();
}

WeatherMenuButton.prototype = {
    __proto__: PanelMenu.Button.prototype,

    _init: function() {
    
        // Panel icon
        this._weatherIcon = new St.Icon({ icon_type: St.IconType.FULLCOLOR, icon_size: Main.panel.button.get_child().height - 4, icon_name: 'view-refresh-symbolic' });
        if (Main.panel.actor.get_direction() == St.TextDirection.RTL) {
            this._weatherIcon.set_style('padding-left: 5px;');
        }
        else {
            this._weatherIcon.set_style('padding-right: 5px;');
        }
        
        // Label
        this._weatherInfo = new St.Label({ text: 'Loading weather...' });

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
        let mainBox = new St.BoxLayout();
        mainBox.set_vertical(true);
        mainBox.add_actor(this._currentWeather);
        mainBox.add_actor(this._separatorArea);
        //mainBox.add_actor(this._futureWeather);
        
        this.menu.addActor(mainBox);
        
        // Items
        this.showLoadingUi();
        
        // TODO: start weather request and hook up event handlers.
        
        this.rebuildCurrentWeatherUi();
        this.refreshWeather();
    },
    
    refreshWeather: function() {
        // Refreshing current weather
        let location = 'Budapest'; /* TODO */
        let comment = 'Snowing'; /* TODO */
        let temperature = '0'; /* TODO */
        let temperature_unit = 'C'; /* TODO */
        let humidity = '20 %'; /* TODO */
        let wind = 'Northwest 20 km/h'; /* TODO */
        let iconname = 'weather-snow-symbolic'; /* TODO */
        
        this._currentWeatherIcon.icon_name = this._weatherIcon.icon_name = iconname;
        this._weatherInfo.text = (comment + ', ' + temperature + ' ' + temperature_unit);
        
        this._currentWeatherSummary.text = comment;
        this._currentWeatherLocation.text = location;
        this._currentWeatherTemperature.text = 'Temperature: ' + temperature + ' ' + temperature_unit;
        this._currentWeatherHumidity.text = 'Humidity: ' + humidity;
        this._currentWeatherWind.text = 'Wind: ' + wind;
        
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
        this._currentWeather.set_child(new St.Label({ text: 'Loading current weather...' }));
        this._futureWeather.set_child(new St.Label({ text: 'Loading future weather...' }));
    },
    
    rebuildCurrentWeatherUi: function() {
        this.destroyCurrentWeather();
        
        // This will hold the icon for the current weather
        this._currentWeatherIcon = new St.Icon({ icon_type: St.IconType.FULLCOLOR, icon_size: 64, icon_name: 'view-refresh-symbolic' });
        if (Main.panel.actor.get_direction() == St.TextDirection.RTL) {
            this._currentWeatherIcon.set_style('padding-left: 10px;');
        }
        else {
            this._currentWeatherIcon.set_style('padding-right: 10px;');
        }
        
        // The summary of the current weather
        this._currentWeatherSummary = new St.Label({ text: 'Loading...' });
        this._currentWeatherSummary.set_style('font-size: 35px;');
        // Other labels
        this._currentWeatherLocation = new St.Label({ text: 'Please wait' });
        this._currentWeatherTemperature = new St.Label({ text: 'Temperature: ...' });
        this._currentWeatherHumidity = new St.Label({ text: 'Humidity: ...' });
        this._currentWeatherWind = new St.Label({ text: 'Wind: ...' });
        
        let bb = new St.BoxLayout();
        bb.set_vertical(true);
        bb.add_actor(this._currentWeatherLocation);
        bb.add_actor(this._currentWeatherSummary);
        bb.set_style('padding-top: 15px;');
        
        let rb = new St.BoxLayout();
        rb.set_vertical(true);
        rb.add_actor(this._currentWeatherTemperature);
        rb.add_actor(this._currentWeatherHumidity);
        rb.add_actor(this._currentWeatherWind);
        rb.set_style('padding-top: 15px; padding-left: 10px;');
        
        let xb = new St.BoxLayout();
        xb.add_actor(bb);
        xb.add_actor(rb);
        
        let box = new St.BoxLayout();
        box.add_actor(this._currentWeatherIcon);
        box.add_actor(xb);
        box.set_style('padding: 10px;');
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

