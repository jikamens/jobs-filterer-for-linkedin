/*
Copyright 2023 Jonathan Kamens.

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU General Public License as published by the Free Software
Foundation, either version 3 of the License, or (at your option) any later
version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with
this program. If not, see <https://www.gnu.org/licenses/>.
*/

chrome.runtime.onInstalled.addListener(function (object) {
    chrome.storage.sync.get(["showChanges"]).then((options) => {
        if ((options["showChanges"] === undefined ||
             options["showChanges"]) &&
            (object.reason == chrome.runtime.OnInstalledReason.INSTALL ||
             object.reason == chrome.runtime.OnInstalledReason.UPDATE))
            chrome.tabs.create({url: "changes.html"});
    })
});

chrome.action.onClicked.addListener(() => {
    chrome.runtime.openOptionsPage();
});
