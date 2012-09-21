#!/bin/sh

UUID="weather@mockturtl"
OLD_UUID="cinnamon-weather@mockturtl"
SCHEMA_DIR="/usr/share/glib-2.0/schemas/"
OLD_SCHEMA="${OLD_UUID}.gschema.xml"
SCHEMA="org.cinnamon.applets.${UUID}.gschema.xml"
INSTALL_DIR="${HOME}/.local/share/cinnamon/applets/${UUID}"
OLD_INSTALL_DIR="${HOME}/.local/share/cinnamon/applets/${OLD_UUID}"
LOCALES="bg ca cs da de el es fi fr he is it ja lv nb nl pl pt_BR pt_PT ro ru sk sv uk zh_CN zh_TW"
LOCALE_DIR="${HOME}/.local/share/locale"

compile_schemas() {
	glib-compile-schemas --dry-run ${SCHEMA_DIR} &&
		sudo glib-compile-schemas ${SCHEMA_DIR}
}

do_install() {
	cat << EOF

	Installing applet in ${INSTALL_DIR}...
EOF
	
	sudo cp -f ${SCHEMA} ${SCHEMA_DIR} &&
		compile_schemas

	mkdir -p ${INSTALL_DIR}

	sudo ln -sf ${INSTALL_DIR}/cinnamon-weather-settings /usr/local/bin
	cp -f metadata.json applet.js cinnamon-weather-settings icon.png stylesheet.css ${INSTALL_DIR}

	cat << EOF
	Installing applet locales in ${LOCALE_DIR}...
EOF
	for LOCALE in ${LOCALES}; do
		mkdir -p ${LOCALE_DIR}/${LOCALE}/LC_MESSAGES
		msgfmt -c po/${LOCALE}.po -o ${LOCALE_DIR}/${LOCALE}/LC_MESSAGES/${UUID}.mo
	done

	chown -R ${USER} ${INSTALL_DIR} ${LOCALE_DIR} 2>/dev/null
}

do_uninstall() {
	cat << EOF

	Removing applet from ${INSTALL_DIR} ...
EOF
	if [ -f "${SCHEMA_DIR}/${SCHEMA}" ]; then
		sudo rm -f ${SCHEMA_DIR}/${SCHEMA}
		dconf reset -f /org/cinnamon/applets/${UUID}/
	fi

	compile_schemas

	rm -rf ${INSTALL_DIR}
	sudo rm -f /usr/local/bin/cinnamon-weather-settings

	cat << EOF
	Removing applet locales from ${LOCALE_DIR} ...
EOF
	for LOCALE in ${LOCALES}; do
		rm -f ${LOCALE_DIR}/${LOCALE}/LC_MESSAGES/${UUID}.mo
	done
}

# housekeeping for poor namespace convention < v1.3.2
do_cleanup() {
	cat << EOF

	Removing old installation of applet from ${OLD_INSTALL_DIR}...
EOF
	if [ -f "${SCHEMA_DIR}/${OLD_SCHEMA}" ]; then
		sudo rm -f ${SCHEMA_DIR}/${OLD_SCHEMA}
		# this location may contain other data
		dconf reset -f /org/cinnamon/weather/
	fi
	
	compile_schemas
	
	rm -rf ${OLD_INSTALL_DIR}
		
	cat << EOF
	Removing old applet locales from ${LOCALE_DIR} ...
EOF
	for LOCALE in ${LOCALES}; do
		rm -f ${LOCALE_DIR}/${LOCALE}/LC_MESSAGES/${OLD_UUID}.mo
	done
}

# maintainer script for gettext
do_translate() {
	cat << EOF

	Updating template...
EOF
	xgettext -d ${UUID} -o po/${UUID}.pot -L python -j --keyword=_ applet.js

	cat << EOF
	Merging existing translation files with new template...
EOF
	for LOCALE in ${LOCALES}; do
		msgmerge -U po/${LOCALE}.po po/${UUID}.pot
	done
}

case `basename $0` in
	"install.sh")
		do_install
		;;
	"uninstall.sh")
		do_uninstall
		;;
	"cleanup.sh")
		do_cleanup
		;;
	"translate.sh")
		do_translate
		;;
esac

cat << EOF

	*** You need to restart Cinnamon ( Alt-F2 => "r" <enter> ) ***

EOF
