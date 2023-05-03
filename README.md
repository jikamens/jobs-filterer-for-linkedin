# LinkedIn Jobs Filterer Chrome and Firefox Extension

LinkedIn's "recommended jobs” and job search functionality are pretty
good at finding jobs you might be interested in, but unfortunately
they're pretty bad at finding *only* jobs you might be interested in,
i.e., they show you many jobs you don't care about. Furthermore,
although there are buttons you can click to supposedly tell LinkedIn
not to show you a particular job again, it frequently ignores this.

The code here implements a Chrome and Firefox extension which allows
you to improve the quality of these lists of jobs by filtering out
jobs you don't want to see based on regular-expression matches on the
job title, company name, or location.

You can install this extension from the [Chrome Web Store][cws] or
[Firefox Browser Add-Ons Site][amo]. You can also install it from the
source code as described below.

Once you've installed the extension, open the options page for the
extension to configure it and see further instructions for how to use
it. To open the options page, click on the extension's icon (a white
funnel) in your URL bar. If you don't have the icon pinned to your URL
bar, click the puzzle-piece icon to open a pop-up menu of unpinned
extensions and click on LinkedIn Jobs Filterer in that menu.

This extension was written by Jonathan Kamens. If you find this
extension useful, you can buy me a coffee [here][blog].

The source code for this extension lives [here][github].

## Installing from source code

### Chrome

To load this extension into Chrome from source code:

1. Download the source code from Github to your computer, either by
   cloning it with Git or by downloading and unpacking
   [this zip file][zip].

2. Run `make` in the source directory to build the extension.

3. Paste "`chrome://extensions`" into your URL bar.

4. If the "Developer mode" switch in the upper right corner isn't
   enabled, enable it.

5. Click the "Load unpacked" button.

6. Select the directory containing the extension's source code.

### Firefox

Firefox makes it _very difficult_ to install extensions that haven't
been signed by Mozilla. You'll need to be running a version of Firefox
that allows this, e.g., [Developer Edition][ffdev],
[Nightly][ffnightly], or [Unbranded][ffunbranded].

If you are using one of these Firefox versions, then you can set the
preference `xpinstall.signatures.required` to false by visiting
`about:config`, then run `make` in the source directory to build
`LinkedInJobsFilterer.xpi`, then open the add-ons page in Firefox,
click on the gear icon, select "Install Add-on From File...", and
browse to the XPI file.

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
[amo]: https://addons.mozilla.org/firefox/addon/linkedin-jobs-filterer/
[blog]: https://blog.kamens.us/support-my-blog
[github]: https://github.com/jikamens/linkedin-job-filterer
[gpl]: https://www.gnu.org/licenses/
[zip]: https://github.com/jikamens/linkedin-job-filterer/archive/refs/heads/main.zip
[ffdev]: https://www.mozilla.org/firefox/developer/
[ffnightly]: https://www.mozilla.org/firefox/nightly/notes/
[ffunbranded]: https://wiki.mozilla.org/Add-ons/Extension_Signing#Unbranded_Builds
