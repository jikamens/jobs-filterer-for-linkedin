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

function getTextArea(id) {
    var elt = document.getElementById(id);
    var items = elt.value.split("\n");
    var new_items = [];
    for (var item of items) {
        item = item.trim();
        if (item != "") {
            new_items.push(item);
        }
    }
    return new_items;
}

function escapeHTML(unsafeText) {
    let div = document.createElement('div');
    div.innerText = unsafeText;
    return div.innerHTML;
}

function checkRegExps(regexps) {
    for (var regexp of regexps) {
        try {
            var compiled = new RegExp(regexp);
        }
        catch (ex) {
            quoted = escapeHTML(ex.message);
            document.getElementById("status").innerHTML =
                `<font color="red">${quoted}</font>`;
            return false;
        }
    }
    return true;
}

function saveOptions() {
    var hide = document.getElementById("hideJobs").checked;
    var titles = getTextArea("titles");
    var companies = getTextArea("companies");
    var locations = getTextArea("locations");

    if (! (checkRegExps(titles) &&
           checkRegExps(companies) &&
           checkRegExps(locations))) {
        return;
    }

    chrome.storage.sync.set({
        hideJobs: hide,
        jobRegexps: titles,
        companyRegexps: companies,
        locationRegexps: locations
    }).then(() => {
        // Update status to let user know options were saved.
        var status = document.getElementById("status");
        status.innerHTML = "<font color='green'>Options saved.</font>";
        setTimeout(function() {
            status.textContent = "";
        }, 1000);
    });
}

function setTextArea(id, regexps) {
    var elt = document.getElementById(id);
    if (! regexps || ! regexps.length) {
        elt.value = "";
        return;
    }
    elt.value = regexps.join("\n") + "\n";
}

function restoreOptions() {
    chrome.storage.sync.get().then((options) => {
        document.getElementById("hideJobs").checked = options["hideJobs"];
        setTextArea("titles", options["jobRegexps"]);
        setTextArea("companies", options["companyRegexps"]);
        setTextArea("locations", options["locationRegexps"]);
    });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
