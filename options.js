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

var utils;

async function loadUtils() {
    if (utils)
        return;
    const src = chrome.runtime.getURL("utils.js");
    utils = await import(src);
}

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
            new RegExp(regexp);
        }
        catch (ex) {
            error(ex.message);
            return false;
        }
    }
    return true;
}

function parseJobFilters(specStrings) {
    var specArrays = specStrings.map(s=>s.split(/\s*\/\/\s*/))
    var specs = [];
    for (var specString of specStrings) {
        let specArray = specArrays.shift();
        if (specArray.length < 3) {
            error(`Too few fields in "${specString}"`);
            return false;
        }
        if (specArray.length > 3) {
            error(`Too many fields in "${specString}"`);
            return false;
        }
        specs.push({
            title: specArray[0],
            company: specArray[1],
            location: specArray[2]
        });
    }
    return specs;
}

function error(msg) {
    var quoted = escapeHTML(msg);
    document.getElementById("status").innerHTML =
        `<font color="red">${quoted}</font>`;
}

function saveOptions() {
    var hide = document.getElementById("hideJobs").checked;
    var showChanges = document.getElementById("showChanges").checked;
    var titles = getTextArea("titles");
    var companies = getTextArea("companies");
    var locations = getTextArea("locations");
    var jobs = getTextArea("jobs");

    if (! (checkRegExps(titles) &&
           checkRegExps(companies) &&
           checkRegExps(locations))) {
        return;
    }

    var jobFilters = parseJobFilters(jobs);
    if (jobFilters === false)
        return;

    // Only store what has changed, or we will too frequently run into the max
    // write per minute limit.
    var newOptions = {
        hideJobs: hide,
        showChanges: showChanges,
        titleRegexps: titles,
        companyRegexps: companies,
        locationRegexps: locations,
        jobFilters: jobFilters
    };

    chrome.storage.sync.get().then((oldOptions) => {
        saveChanges(oldOptions, newOptions).then();
    });
}

async function saveChanges(oldOptions, newOptions) {
    await loadUtils();
    var status = document.getElementById("status");
    var booleans = {};
    var lists = {}
    var changed = false;
    for (var [key, value] of Object.entries(newOptions)) {
        if (! utils.valuesAreEqual(value, oldOptions[key])) {
            if (typeof(value) == "boolean")
                booleans[key] = value;
            else
                lists[key] = value;
            changed = true;
        }
    }
    if (! changed) {
        status.innerHTML = "<font color='green'>No changes.</font>";
        setTimeout(function() {
            status.textContent = "";
        }, 1000);
        return;
    }
    try {
        await chrome.storage.sync.set(booleans);
        for ([key, value] of Object.entries(lists)) {
            await utils.saveListToStorage(key, value);
        }
        status.innerHTML = "<font color='green'>Options saved.</font>";
        setTimeout(function() {
            status.textContent = "";
        }, 1000);
    }
    catch (error) {
        var msg = escapeHTML(error.message);
        status.innerHTML =
            `<font color='red'>Error saving options: ${msg}</font>`;
        setTimeout(function() {
            status.textContent = "";
        }, 1000);
    }
}

function setTextArea(id, regexps) {
    var elt = document.getElementById(id);
    if (! regexps || ! regexps.length) {
        elt.value = "";
        return;
    }
    elt.value = regexps.join("\n") + (regexps.length ? "\n" : "");
}

function populateJobsArea(filters) {
    if (! filters) return;
    filters = filters.map(f => `${f.title} // ${f.company} // ${f.location}`)
    document.getElementById("jobs").value = filters.join("\n") +
        (filters.length ? "\n" : "");
    
}

function optionsChanged(changes, namespace) {
    if (namespace != "sync") return;
    restoreOptions();
}

async function restoreOptions() {
    await loadUtils();
    var booleans = await chrome.storage.sync.get(["hideJobs", "showChanges"]);
    var titleRegexps = await utils.readListFromStorage("titleRegexps");
    var companyRegexps = await utils.readListFromStorage("companyRegexps");
    var locationRegexps = await utils.readListFromStorage("locationRegexps");
    var jobFilters = await utils.readListFromStorage("jobFilters");

    document.getElementById("hideJobs").checked = booleans["hideJobs"];

    var show;
    if (booleans["showChanges"] === undefined)
        show = true;
    else
        show = booleans["showChanges"];
    document.getElementById("showChanges").checked = show;

    setTextArea("titles", titleRegexps);
    setTextArea("companies", companyRegexps);
    setTextArea("locations", locationRegexps);
    populateJobsArea(jobFilters);
}

chrome.storage.onChanged.addListener(optionsChanged);
document.addEventListener("DOMContentLoaded", restoreOptions);
document.getElementById("save").addEventListener("click", saveOptions);
document.getElementById("hideJobs").addEventListener("change", saveOptions);
document.getElementById("showChanges").addEventListener("change", saveOptions);
