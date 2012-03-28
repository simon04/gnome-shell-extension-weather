#!/usr/bin/env python2.7
# -*- coding: utf-8 -*-
# -*- Mode: Python; py-indent-offset: 4 -*-
# vim: tabstop=4 shiftwidth=4 expandtab

# weather-extension-configurator: 
# configures gnome-shell-extension-weather by simon04
# Copyright (C) 2011 Simon Legner
#
# based on a configurator for system-monitor-extension by Florian Mounier aka paradoxxxzero

# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.

# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.

# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.

# Author: Simon Legner aka simon04
# original version of: Igor Ingultsov aka inv, aka invy

"""
gnome-shell-weather-extension-config
Tool for editing gnome-shell-weather-extension-config preference as
an alternative of dconf-editor
"""

from gi.repository import Gtk, Gio, Gdk

class WeatherConfigurator:

    def keypress(self, widget, event):
        if event.keyval == 65307: #Gtk.keysyms.Escape:
            Gtk.main_quit()

    def add_tooltip(self, item, tt):
        def tooltip(item, x, y, key_mode, tooltip):
            tooltip.set_text(tt)
            return True
        if tt:
            item.set_has_tooltip(True)
            item.connect('query-tooltip', tooltip)

    def add_label(self, label, tooltip):
        label = Gtk.Label(label + ":")
        label.set_use_markup(True)
        label.set_alignment(1, 0.5)
        self.add_tooltip(label, tooltip)
        self.elements.append(label)
        return label

    def add_text(self, key, label, tooltip=None):
        def set(tb):
            self.schema.set_string(key, tb.get_text())
        entry = Gtk.Entry()
        entry.set_text(self.schema.get_string(key))
        entry.connect('activate', set)
        entry.connect('focus-out-event', lambda x, y: set(x))
        self.add_tooltip(entry, tooltip)
        label = self.add_label(label, tooltip)
        self.elements.append(entry)
        return (entry, label)

    def add_radio(self, key, label, items, tooltip=None):
        def set(rb):
            if rb.get_active():
                val = [item[0] for item in items if item[1] == rb.get_label()][0]
                self.schema.set_enum(key, val)
        vbox = Gtk.VBox()
        buttonFirst = None
        active = self.schema.get_enum(key)
        buttons = []
        for (idx,item) in items:
            button = Gtk.RadioButton(group=buttonFirst, label=item)
            if not(buttonFirst): buttonFirst = button
            button.set_active(active == idx)
            button.connect('toggled', set)
            self.add_tooltip(button, tooltip)
            vbox.add(button)
            buttons.append(button)
        label = self.add_label(label, tooltip)
        self.elements.append(vbox)
        return (buttons, label)

    def add_check(self, key, label, tooltip=None):
        def set(cb):
            self.schema.set_boolean(key, cb.get_active())
        button = Gtk.CheckButton(None)
        active = self.schema.get_boolean(key)
        button.set_active(active)
        button.connect('toggled', set)
        self.add_tooltip(button, tooltip)
        label = self.add_label(label, tooltip)
        self.elements.append(button)
        return (button, label)

    def __init__(self):
        self.schema = Gio.Settings('org.gnome.shell.extensions.weather')
        keys = self.schema.keys()

        self.window = Gtk.Window(title='Gnome Shell: Weather Configurator')
        self.window.connect('destroy', Gtk.main_quit)
        self.window.connect('key-press-event', self.keypress)

        self.elements = []

        self.add_text('woeid', '<b>WOEID</b>',
                "The Where On Earth ID determinees the location/city")
        self.add_radio('unit', 'Temperature Unit',
                [(0, 'celsius'), (1, 'fahrenheit')])
        self.add_radio('wind-speed-unit', 'Wind Speed Unit',
                [(0, 'kph'), (1, 'mph'), (2, 'm/s'), (3, 'knots')])
        self.add_text('city', 'Override Location Label',
                "Sometimes your WOEID location isn’t quite right (it’s the next major city around). This label is used to override the location displayed.")
        self.add_radio('position-in-panel', 'Position in Panel',
                [(2, 'left'), (0, 'center'), (1, 'right')],
                "The position of this GNOME Shell extension in the panel. (Requires restart of GNOME Shell.)")
        self.add_check('translate-condition', 'Translate Weather Conditions',
                "If enabled, the condition is translated based on the weather code.\nIf disabled, the condition string from Yahoo is taken.\nNote: Enabling the translation sometimes results in loss of accuracy, e.g., the condition string “PM Thunderstorms” cannot be expressed in terms of weather codes.")
        self.add_check('show-sunrise-sunset', 'Show Sunrise / Sunset times',
                "Whether to show Sunrise / Sunset times in current weather")
        self.add_check('use-symbolic-icons', 'Symbolic Icons',
                "Display symbolic icons instead of full-colored icons")
        (b_text, _) = self.add_check('show-text-in-panel', 'Show Text in Panel',
                "Display current temperature in panel. If disabled, only the current condition icon is shown. (Requires restart of GNOME Shell.)")
        (b_cond, l_cond) = self.add_check('show-comment-in-panel', '    Include Condition',
                "Whether to show the weather condition (e.g., “Windy”, “Clear”) in the panel.")

        # add dependency between text-in-panel and comment-in-panel
        def depend(rb):
            b_cond.set_sensitive(rb.get_active())
            l_cond.set_sensitive(rb.get_active())
        b_text.connect('toggled', depend)
        depend(b_text)

        table = Gtk.Table(rows=len(self.elements)/2, columns=2, homogeneous=False)
        for (idx,el) in enumerate(self.elements):
            row = idx / 2
            col = idx % 2
            table.attach(el, col, col+1, row, row+1)
            table.set_row_spacing(row, 20)
            table.set_col_spacing(col, 10)
        self.window.add(table)

        self.window.set_border_width(20)
        self.window.show_all()

def main():
    WeatherConfigurator()
    Gtk.main()

if __name__ == '__main__':
    main()
