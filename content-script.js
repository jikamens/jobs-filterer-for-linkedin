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

const cardClasses = ["jobs-search-results__list-item",
                     "jobs-job-board-list__item"];
const companyClasses = ["job-card-container__primary-description",
                        "job-card-container__company-name"];
const titleClasses = ["job-card-list__title"];
const locationClasses = ["job-card-container__metadata-item"];
const workplaceClasses = ["job-card-container__metadata-item--workplace-type"]

var titleRegexps, companyRegexps, locationRegexps, jobFilters, hideJobs;

function findDismissButton(elt) {
    var elts = elt.getElementsByTagName("button");
    for (elt of elts) {
        var label = elt.getAttribute("aria-label");
        if (label && (label.includes("Hide") || label.includes("Dismiss") ||
                      /^Mark .* with Not for me/.test(label)))
            return elt;
    }
    return null;
}

function findUnhideButton(elt) {
    var elts = elt.getElementsByTagName("button");
    for (elt of elts)
        if (elt.innerText == "Undo")
            return elt;
    return null;
}

function getLocation(elt) {
    var location = getClassValue(locationClasses, elt)
    if (! location)
        return false;
    var workplace = getClassValue(workplaceClasses, elt)
    if (workplace)
        location = `${location} (${workplace})`;
    return location;
}

function getJobSpec(elt) {
    var spec = {
        title: getClassValue(titleClasses, elt),
        company: getClassValue(companyClasses, elt),
        location: getLocation(elt)
    };
    if (! (spec.title && spec.company && spec.location))
        return null;
    return spec;
}

function filterOneJob(elt) {
    var hideButton = findDismissButton(elt);
    if (hideButton && ! elt.getAttribute("jobsFiltererFiltered")) {
        elt.setAttribute("jobsFiltererFiltered", true);
        var jobSpec = getJobSpec(elt);
        if (! jobSpec) return;
        if ((matches(jobSpec.title, titleRegexps) ||
             matches(jobSpec.company, companyRegexps) ||
             matches(jobSpec.location, locationRegexps) ||
             jobMatches(jobSpec))) {
            hideButton.click();
            if (hideJobs)
                elt.hidden = true;
            return;
        }
        var hideListener;
        hideListener = (event) => {
            event.currentTarget.removeEventListener("click", hideListener);
            hideJob(jobSpec, elt);
        };
        hideButton.addEventListener("click", hideListener);
    }
    var unhideButton = findUnhideButton(elt);
    if (unhideButton && ! elt.getAttribute("jobsFiltererUnfiltered")) {
        elt.setAttribute("jobsFiltererUnfiltered", true);
        var unhideListener;
        unhideListener = (event) => {
            event.currentTarget.removeEventListener("click", unhideListener);
            // There is a delay here to give LinkedIn time to repopulate the
            // job data so that we can find it when trying to unhide the job.
            setInterval(() => { unhideJob(elt); }, 2000);
        };
        unhideButton.addEventListener("click", unhideListener);
    }
}

function matches(fieldValue, regexps) {
    if (! fieldValue) return false;
    return regexps.some(r => r.test(fieldValue));
}

function getClassValue(classes, elt) {
    var selector = classes.map(c => `.${c}`).join(", ");
    var elts = elt.querySelectorAll(selector);
    if (elts.length == 0) return false;
    return elts[0].innerText;
}

function jobMatches(jobSpec) {
    return jobFilters.some(f => utils.valuesAreEqual(f, jobSpec));
}

function hideJob(jobSpec) {
    var title = jobSpec.title;
    var company = jobSpec.company;
    var location = jobSpec.location;
    // Don't list a job explicitly if it's already filtered by the regular
    // expressions, presumably because the user just edited them to include it,
    // or if it's already listed. This could happen if user hides a job and then
    // unhides it and then we detect the DOM change and scan the job again,
    // generating an artificial click event which causes this function to be
    // called. (This shouldn't happen anymore with recent code improvements but
    // I'm leaving this in as a precautionary measure.)
    if (matches(title, titleRegexps) ||
        matches(company, companyRegexps) ||
        matches(location, locationRegexps) ||
        jobMatches(jobSpec))
        return;
    jobFilters.unshift(jobSpec);
    utils.saveListToStorage("jobFilters", jobFilters).then();
}

function unhideJob(elt) {
    // Find the job details, check if they're in jobFilters, and remove them
    // if so.
    var jobSpec = getJobSpec(elt);
    if (! jobSpec) return;
    var changed = false;
    for (var i = jobFilters.length - 1; i >= 0; i--)
        if (utils.valuesAreEqual(jobFilters[i], jobSpec)) {
            changed = true;
            jobFilters.splice(i, 1);
        }
    if (changed)
        utils.saveListToStorage("jobFilters", jobFilters).then();
}

function filterEverything() {
    var elts = document.querySelectorAll(
        cardClasses.map(c => `.${c}`).join(", "));
    for (var elt of elts) {
        filterOneJob(elt);
    }
}

async function loadOptions() {
    await loadUtils();
    utils.readListFromStorage("titleRegexps").then((items) => {
        titleRegexps = compileRegexps(items);
    });
    utils.readListFromStorage("companyRegexps").then((items) => {
        companyRegexps = compileRegexps(items);
    });
    utils.readListFromStorage("locationRegexps").then((items) => {
        locationRegexps = compileRegexps(items);
    });
    utils.readListFromStorage("jobFilters").then((items) => {
        jobFilters = items;
    });
    chrome.storage.sync.get(["hideJobs"]).then((options) => {
        hideJobs = options["hideJobs"];
    });
}

function compileRegexps(regexps) {
    if (! regexps) return [];
    var compiled = [];
    for (var regexp of regexps) {
        try {
            regexp = new RegExp(regexp);
        }
        catch (ex) {
            console.log(ex.message);
            continue;
        }
        compiled.push(regexp);
    }
    return compiled;
}

var topObserver = null;

function createTopObserver() {
    var config = {childList: true, subtree: true};
    // eslint-disable-next-line no-unused-vars
    var callback = (mutationList, observer) => {
        filterEverything();
    };
    topObserver = new MutationObserver(callback);
    topObserver.observe(document.body, config);
}

if (! topObserver) {
    createTopObserver();
}

loadOptions();
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace != "sync") return;
    loadOptions();
});
