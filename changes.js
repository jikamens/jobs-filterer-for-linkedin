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

function saveOptions() {
    console.log("foo");
    var show = document.getElementById("showChanges").checked;
    chrome.storage.sync.set({showChanges: show}).then();
}

function restoreOptions() {
    document.getElementById("showChanges").addEventListener(
        "change", saveOptions);
    chrome.storage.sync.get(["showChanges"]).then((options) => {
        var show;
        if (options["showChanges"] === undefined)
            show = true;
        else
            show = options["showChanges"];
        document.getElementById("showChanges").checked = show;
    });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
