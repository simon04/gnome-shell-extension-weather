extensionurl = https://github.com/Neroth/gnome-shell-extension-weather

# Change these to modify how installation is performed
topextensiondir = $(datadir)/gnome-shell/extensions

uuid = weather@gnome-shell-extensions.gnome.org

extensiondir = $(topextensiondir)/$(uuid)

if DESKTOP_DATADIR

applicationsdir = $(DESKTOP_DATADIR)/applications
applications_DATA = weather-settings.desktop

endif

dist_extension_DATA = stylesheet.css weather-settings.ui

nodist_extension_DATA = metadata.json $(EXTRA_EXTENSION)

EXTRA_DIST = metadata.json.in weather-settings.desktop.in

metadata.json: metadata.json.in $(top_builddir)/config.status
	$(AM_V_GEN) sed -e "s|[@]LOCALEDIR@|$(datadir)/locale|" \
	    -e "s|[@]uuid@|$(uuid)|" \
	    -e "s|[@]url@|$(extensionurl)|" $< > $@

weather-settings.desktop: weather-settings.desktop.in $(top_builddir)/config.status
	$(AM_V_GEN) sed -e "s|[@]EXTENSIONDIR@|$(extensiondir)|" $< > $@

CLEANFILES = metadata.json weather-settings.desktop

gschemas_in = org.gnome.shell.extensions.weather.gschema.xml.in

@INTLTOOL_XML_NOMERGE_RULE@

gsettings_SCHEMAS = $(gschemas_in:.xml.in=.xml) @GSETTINGS_RULES@

EXTRA_DIST += $(gschemas_in)
CLEANFILES += $(gschemas_in:.xml.in=.valid) $(gsettings_SCHEMAS)
