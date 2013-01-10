ACLOCAL_AMFLAGS = -I m4 ${ACLOCAL_FLAGS}

SUBDIRS = src data po

zip-file: all
if LOCAL_INSTALL
	-rm -fR $(builddir)/_build
	$(MKDIR_P) $(builddir)/_build; \
	$(MAKE) install DESTDIR="$(abs_builddir)/_build"; \
	$(GLIB_COMPILE_SCHEMAS) "$(abs_builddir)/_build/$(prefix)/share/gnome-shell/extensions/weather@gnome-shell-extensions.gnome.org/schemas"; \
	(cd "$(abs_builddir)/_build/$(prefix)/share/gnome-shell/extensions/weather@gnome-shell-extensions.gnome.org" ; \
	zip -qr "$(abs_builddir)/gnome-shell-extension-weather.zip" .; \
	); \
	rm -fR $(builddir)/_build ; \
	echo "===================================================================" ; \
	echo "zip-file ready for distribution:" ; \
	echo "gnome-shell-extension-weather.zip" ; \
	echo "==================================================================="
else
	@echo "*"
	@echo "* You need to configure the package --with-local-install=yes to create a zip-file."
	@echo "*"
endif

clean-local:
	rm -f "$(abs_builddir)/gnome-shell-extension-weather.zip"

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
