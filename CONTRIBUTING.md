Contributing
============

### Help! It's my first time.

Welcome! You may wish to read GitHub's [orientation][], or learn the [Markdown][]<a href="#fn-1" id="fnref-1" title="see footnote">¹</a> syntax for rich text.

Prefer using the [issue tracker][] for all communication.  I may miss posts to the mailing list or cinnamon-spices website. 

### I want to help translate.

Translation files are in the [`po`][] directory.

A pull request is best -- it's easier than you think.  But I will take contributions in any form: email, carrier pigeon...

I can normally merge your changes and release a new version within three days.

###### new languages

I'm happy to provide new language templates.  Ask and you shall receive.

To make one yourself, install the `gettext` package and run `msginit`, passing 

- the correct locale code for your language `-l` (ex: `ko_KR` is Korean)
- the matching `.po` output filename `-o` (ex: `ko.po`)

```sh
$ cd po/
$ msginit -l ko_KR -o ko.po -i weather@mockturtl.pot
```

Simply open the new file and fill in values, then send it to me.

It's okay if you don't use them all.  Every line helps.

### I found a bug.

Please mention your distro, Cinnamon version, and applet version.

### I have a feature request, or code changes.

Squash your changes into a single commit, if possible.  I will probably make some adjustments and ask you for a code review.

I can't guarantee I will respond to these issues promptly, or ever. Feel free to @mention me in the issue comments if too much time has passed.

###### Style guide

New code should have:

- [no semicolons][]
- [commas first][]
- 2-space indentation
- short (LoC) functions with a consistent level of abstraction
- [well-formatted commit messages][git-log-fmt]


<a id="fn-1">¹</a> _By the time you read this, the [CommonMark][] standard will hopefully be used everywhere._ <a href="#fnref-1" title="back to content">&#160;&#8617;</a>

[`po`]: https://github.com/mockturtl/cinnamon-weather/tree/master/po
[orientation]: https://help.github.com/categories/bootcamp/
[markdown]: https://help.github.com/articles/markdown-basics/
[commonmark]: http://commonmark.org/
[issue tracker]: https://github.com/mockturtl/cinnamon-weather/issues
[no semicolons]: http://blog.izs.me/post/2353458699/an-open-letter-to-javascript-leaders-regarding
[commas first]: https://gist.github.com/isaacs/357981
[git-log-fmt]: http://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html
