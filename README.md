# LinkedIn Jobs Filterer Chrome Extension

LinkedIn's "recommended jobs” and job search functionality are pretty
good at finding jobs you might be interested in, but unfortunately
they're pretty bad at finding *only* jobs you might be interested in,
i.e., they show you many jobs you don't care about. Furthermore,
although there are buttons you can click to supposedly tell LinkedIn
not to show you a particular job again, it frequently ignores this.

The code here implements a Chrome extension which allows you to
improve the quality of these lists of jobs by filtering out jobs you
don't want to see based on regular-expression matches on the job
title, company name, or location.

You can install this extension from the Chrome Web Store at [TBD]. You
can also install it from the source code as described below.

Once you've installed it, open the options page for the extension and
enter the regular expressions you want to filter with, one per line,
in the text boxes. *Do not enclose your regular expressions in
slashes* like you would if you were writing them in JavaScript.

If you would like filtered jobs to be hidden completely rather than
just greyed out, check the “Hide filtered jobs completely” checkbox.

Remember to click Save when you're done editing the options.

Note that the options are saved in synchronized storage, so if you
have sync turned on in Chrome, the options are synchronized across all
the Chrome profiles synchronizing via the same Google account.

Documenting how to write regular expressions is beyond the scope of
this document; [here][1] is one of the many online tutorials about
this.

This extension was written by Jonathan Kamens. If you find this
extension useful, you can buy me a coffee [here][2].

The source code for this extension lives [here][3].

## Installing from source code

To load this extension into Chrome from source code:

1. Download the source code from Github to your computer, either by
   cloning it with Git or by downloading and unpacking
   [this zip file][zip].

2. Paste "`chrome://extensions`" into your URL bar.

3. If the "Developer mode" switch in the upper right corner isn't
   enabled, enable it.

4. Click the "Load unpacked button".

5. Select the directory containing the extension's source code.

## Copyright

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or (at
your option) any later version.

This program is distributed in the hope that it will be useful, but
WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see [here][4].

[1]: https://developer.mozilla.org/docs/Web/JavaScript/Guide/Regular_Expressions
[2]: https://blog.kamens.us/support-my-blog
[3]: https://github.com/jikamens/linkedin-job-filterer
[4]: https://www.gnu.org/licenses/
[zip]: https://github.com/jikamens/linkedin-job-filterer/archive/refs/heads/main.zip
