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

const companyClasses = ["job-card-container__primary-description",
                        "job-card-container__company-name"];
const titleClasses = ["job-card-list__title"];
const locationClasses = ["job-card-container__metadata-item"];
const allClasses = companyClasses.concat(titleClasses, locationClasses);

var titleRegexps, companyRegexps, locationRegexps, jobFilters, hideJobs;

function filterOneJob(elt) {
    var button = elt.getElementsByTagName("button")[0];
    var jobSpec = {
        title: getClassValue(titleClasses, elt),
        company: getClassValue(companyClasses, elt),
        location: getClassValue(locationClasses, elt)
    };
    let random = Math.random();
    if (! (matches(jobSpec.title, titleRegexps) ||
           matches(jobSpec.company, companyRegexps) ||
           matches(jobSpec.location, locationRegexps) ||
           jobMatches(jobFilters, elt))) {
        if (button)
            button.addEventListener("click", (event) => { hideJob(jobSpec); });
        return;
    }
    if (button)
        button.click();
    if (hideJobs)
        elt.hidden = true;
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

function jobMatches(filters, elt) {
    var company = getClassValue(companyClasses, elt);
    var title = getClassValue(titleClasses, elt);
    var location = getClassValue(locationClasses, elt);
    return filters.some(f => f["company"] == company &&
                        f["title"] == title &&
                        f["location"] == location);
}

function hideJob(jobSpec) {
    var title = jobSpec.title;
    var company = jobSpec.company;
    var location = jobSpec.location;
    if (! (company && title && location)) {
        console.log("Missing value, company=", company,
                    "title=", title, "location=", location);
        return;
    }
    if (matches(title, titleRegexps) ||
        matches(company, companyRegexps) ||
        matches(location, locationRegexps))
        // Don't list a job explicitly if it's already filtered by the
        // regular expressions, presumably because the user just edited them
        // to include it.
        return;
    chrome.storage.sync.get().then((options) => {
        if (! options["jobFilters"]) options["jobFilters"] = [];
        options["jobFilters"].unshift({
            title: title,
            company: company,
            location: location
        });
        chrome.storage.sync.set(options).then();
    });
}

function filterAllJobs(options) {
    var elts = document.querySelectorAll(
        allClasses.map(c => `.${c}`).join(", "));
    for (var elt of elts) {
        if (! (elt = findTop(elt))) return;
        filterOneJob(elt);
    }
}

function findTop(elt) {
    while (elt && elt.tagName.toLowerCase() != "li") {
        elt = elt.parentElement;
    }
    return elt;
}

function loadOptions() {
    chrome.storage.sync.get().then((options) => {
        titleRegexps = compileRegexps(options["titleRegexps"]);
        companyRegexps = compileRegexps(options["companyRegexps"]);
        locationRegexps = compileRegexps(options["locationRegexps"]);
        jobFilters = options["jobFilters"];
        hideJobs = opens["hideJobs"];
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

function filterEverything() {
    chrome.storage.sync.get().then((options) => {
        // Backward compatibility, remove eventually
        if (options["jobRegexps"] && !options["titleRegexps"])
            options["titleRegexps"] = options["jobRegexps"];
        options["jobFilters"] ||= [];
        filterAllJobs(options);
    });
}

var topObserver = null;

function createTopObserver() {
    var config = {childList: true, subtree: true};
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
