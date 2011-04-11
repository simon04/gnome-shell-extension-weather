
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

        // Putting it together
        let topBox = new St.BoxLayout();        
        topBox.add_actor(this._weatherIcon);
        topBox.add_actor(this._weatherInfo);
        this.actor.set_child(topBox);

        let hbox = new St.BoxLayout();
        this.menu.addActor(hbox);
        
        // Items
        hbox.add_actor(new St.Label({ text: 'heyhey' }));

    }
};

function main() {
    this._weatherMenu = new WeatherMenuButton();
    Main.panel._centerBox.add(this._weatherMenu.actor, { y_fill: true });
}

