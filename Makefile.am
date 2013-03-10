ACLOCAL_AMFLAGS = -I m4 ${ACLOCAL_FLAGS}

SUBDIRS = src data po

uuid = "weather-extension@xeked.com"

localprefix = $(HOME)/.local/share/gnome-shell/extensions

zip-file: all
	rm -fR $(builddir)/_build
	rm -fR $(builddir)/zip-file
	$(MKDIR_P) $(builddir)/_build; \
	$(MKDIR_P) $(builddir)/zip-file; \
	$(MAKE) install DESTDIR="$(abs_builddir)/_build"; \
	cp -r "$(builddir)/_build$(datadir)/gnome-shell/extensions/$(uuid)" "$(builddir)/_build"; \
	if [ -f "$(builddir)/_build$(datadir)/glib-2.0/schemas/org.gnome.shell.extensions.weather.gschema.xml" ]; then \
		$(MKDIR_P) "$(builddir)/_build/$(uuid)/schemas"; \
		mv "$(builddir)/_build$(datadir)/glib-2.0/schemas/org.gnome.shell.extensions.weather.gschema.xml" "$(builddir)/_build/$(uuid)/schemas"; \
		glib-compile-schemas "$(builddir)/_build/$(uuid)/schemas"; \
	fi; \
	cp -r "$(builddir)/_build$(datadir)/locale" "$(builddir)/_build/$(uuid)"; \
	(cd "$(builddir)/_build/$(uuid)/"; \
	 zip -qr "$(abs_builddir)/zip-file/weather.shell-extension.zip" .; \
	); \
	rm -fR $(builddir)/_build

local-install: zip-file
	zip_file="$(abs_builddir)/zip-file/weather.shell-extension.zip"; \
	if [ -d "$(localprefix)/$(uuid)" ]; then \
	rm -fR "$(localprefix)/$(uuid)"; \
	fi; \
	$(MKDIR_P) $(localprefix)/$(uuid); \
	(cd $(localprefix)/$(uuid); \
	unzip -q $${zip_file}; \
	);

dist-hook: dist-changelog

.PHONY: dist-changelog

dist-changelog:
	$(AM_V_at)if git --git-dir=$(top_srcdir)/.git --work-tree=$(top_srcdir) \
		log --no-merges --pretty='tformat:%cd  %an  <%ae>%n%n%s%n%n%b'  --date=short 2b58327bf183c94c788a13d746373efc22a3f3c1.. | \
	 $(SED)	-e '/^[12]...-[01].-[0123].  [^<>]*  <[^<>]*>$$/,/^$$/ b' \
		-e '/[^	 ]/,/^[	 ]*$$/ !d' \
		-e 's/^[	 ]*/	/' \
		-e 's/^[	 ]*$$//' >.ChangeLog.tmp; \
	then mv -f .ChangeLog.tmp "$(top_distdir)/ChangeLog"; \
	else rm -f .ChangeLog.tmp; exit 1; fi
