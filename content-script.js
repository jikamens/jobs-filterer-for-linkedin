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

function filterOneJob(options, companyRegexps, titleRegexps, locationRegexps,
                     elt) {
    var button = elt.getElementsByTagName("button")[0];
    if (! (classMatches(companyClasses, companyRegexps, elt) ||
           classMatches(titleClasses, titleRegexps, elt) ||
           classMatches(locationClasses, locationRegexps, elt) ||
           jobMatches(options["jobFilters"], elt))) {
        if (button)
            button.addEventListener("click", handleButtonClick);
        return;
    }
    if (button)
        button.click();
    if (options["hideJobs"])
        elt.hidden = true;
}

function classMatches(classes, regexps, elt) {
    var fieldValue;
    if (! (fieldValue = getClassValue(classes, elt))) return false;
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

function handleButtonClick(event) {
    var elt = findTop(event.currentTarget);
    if (! elt) return;
    var company = getClassValue(companyClasses, elt);
    var title = getClassValue(titleClasses, elt);
    var location = getClassValue(locationClasses, elt);
    if (! (company && title && location)) {
        console.log("Missing value for", elt, "company=", company,
                    "title=", title, "location=", location);
        return;
    }
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
    var companyRegexps = compileRegexps(options["companyRegexps"]);
    var titleRegexps = compileRegexps(options["titleRegexps"]);
    var locationRegexps = compileRegexps(options["locationRegexps"]);
    var elts = document.querySelectorAll(
        allClasses.map(c => `.${c}`).join(", "));
    for (var elt of elts) {
        if (! (elt = findTop(elt))) return;
        filterOneJob(options, companyRegexps, titleRegexps, locationRegexps,
                     elt);
    }
}
    
function findTop(elt) {
    while (elt && elt.tagName.toLowerCase() != "li") {
        elt = elt.parentElement;
    }
    return elt;
}

function compileRegexps(regexps) {
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
