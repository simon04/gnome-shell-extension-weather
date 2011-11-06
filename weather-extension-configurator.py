#!/usr/bin/env python2
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
        label.set_alignment(1, 0.5)
        self.add_tooltip(label, tooltip)
        self.elements.append(label)

    def add_text(self, key, label, tooltip=None):
        def set(tb):
            self.schema.set_string(key, tb.get_text())
        entry = Gtk.Entry()
        entry.set_text(self.schema.get_string(key))
        entry.connect('activate', set)
        self.add_tooltip(entry, tooltip)
        self.add_label(label, tooltip)
        self.elements.append(entry)

    def add_radio(self, key, label, items, tooltip=None):
        def set(rb):
            if rb.get_active():
                self.schema.set_enum(key, items.index(rb.get_label()))
        vbox = Gtk.VBox()
        buttonFirst = None
        active = self.schema.get_enum(key)
        for (idx,item) in enumerate(items):
            button = Gtk.RadioButton(group=buttonFirst, label=item)
            if not(buttonFirst): buttonFirst = button
            button.set_active(active == idx)
            button.connect('toggled', set)
            self.add_tooltip(button, tooltip)
            vbox.add(button)
        self.add_label(label, tooltip)
        self.elements.append(vbox)

    def add_check(self, key, label, tooltip=None):
        def set(cb):
            self.schema.set_boolean(key, cb.get_active())
        button = Gtk.CheckButton(None)
        active = self.schema.get_boolean(key)
        button.set_active(active)
        button.connect('toggled', set)
        self.add_tooltip(button, tooltip)
        self.add_label(label, tooltip)
        self.elements.append(button)

    def __init__(self):
        self.schema = Gio.Settings('org.gnome.shell.extensions.weather')
        keys = self.schema.keys()

        self.window = Gtk.Window(title='Gnome Shell: Weather Configurator')
        self.window.connect('destroy', Gtk.main_quit)
        self.window.connect('key-press-event', self.keypress)

        self.elements = []

        self.add_text('woeid', 'WOEID', 'The Where On Earth ID determinees the location/city')
        self.add_radio('unit', 'Temperature Unit', ['celsius', 'fahrenheit'])
        self.add_text('city', 'Label', "Sometimes your WOEID location isn't quite right (it's the next major city around)")
        self.add_radio('position-in-panel', 'Position in Panel*', ['center', 'right', 'left'], "The position of this GNOME Shell extension in the panel (requires restart of GNOME Shell).")
        self.add_check('translate-condition', 'Translate Weather Conditions', "If enabled, the condition is translated based on the weather code. If disabled, the condition string from Yahoo is taken. Note: Enabling the translation sometimes results in loss of accuracy, e.g., the condition string 'PM Thunderstorms' cannot be expressed in terms of weather codes.")
        self.add_check('use-symbolic-icons', 'Symbolic Icons', "Display symbolic icons instead of full-colored icons")
        self.add_check('show-text-in-panel', 'Show Text in Panel*', "Whether to show the weather condition text (aka. comment) together with the temperature in the panel (requires restart of GNOME Shell).")
        self.add_check('show-comment-in-panel', 'Show Comment in Panel', "Whether to show the comment (aka. weather condition text, e.g. 'Windy', 'Clear') in the panel.")

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
