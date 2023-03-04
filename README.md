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

You can install this extension from the [Chrome Web Store][cws]. You
can also install it from the source code as described below.

Once you've installed the extension, open the options page for the
extension to configure it and see further instructions for how to use
it. There are four ways to open the options page for the extension:

1. Paste
   "`chrome-extension://afjdfegpgbfjgdelebopglhhfkjjblch/options.html`"
   into the URL bar in Chrome.

2. If you have the extension's icon pinned to your URL bar,
   right-click or ctrl-click on it and select "Options".

3. If you don't have the extension's icon pinned to your URL bar,
   click on the puzzle-piece icon to bring up the list of unpinned
   extensions, then click the three dots to the right of ths one and
   select "Options".

4. Paste "`chrome://settings`" into the URL bar, click the "Details"
   button for this extension, and then click the button to the right
   of "Extension options".

This extension was written by Jonathan Kamens. If you find this
extension useful, you can buy me a coffee [here][blog].

The source code for this extension lives [here][github].

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
along with this program. If not, see [here][gpl].

[cws]: https://chrome.google.com/webstore/detail/linkedin-jobs-filterer/afjdfegpgbfjgdelebopglhhfkjjblch/
[blog]: https://blog.kamens.us/support-my-blog
[github]: https://github.com/jikamens/linkedin-job-filterer
[gpl]: https://www.gnu.org/licenses/
[zip]: https://github.com/jikamens/linkedin-job-filterer/archive/refs/heads/main.zip
