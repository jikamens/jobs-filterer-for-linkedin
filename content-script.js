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

function filterJob(elt, hideJob) {
    while (elt.tagName.toLowerCase() != "li") {
        elt = elt.parentElement;
    }
    if (! elt) {
        return;
    }
    if (hideJob) {
        elt.hidden = true;
    }
    var button = elt.getElementsByTagName("button")[0];
    if (button) {
        button.click();
    }
}

function jobMatch(className, regexps, hideJobs) {
    if (! regexps || ! regexps.length) {
        return;
    }
    
    var elts = document.getElementsByClassName(className);
    for (var elt of elts) {
        var text = elt.innerText;
        for (var regexp of regexps) {
            try {
                var compiled = new RegExp(regexp);
            }
            catch (ex) {
                console.log(ex.message);
                continue;
            }
            if (compiled.test(text)) {
                filterJob(elt.parentElement, hideJobs);
            }
        }
    }
}

function filterEverything() {
    chrome.storage.sync.get().then((options) => {
        jobMatch("job-card-container__company-name",
                 options["companyRegexps"], options["hideJobs"]);
        jobMatch("job-card-list__title",
                 options["jobRegexps"], options["hideJobs"]);
        jobMatch("job-card-container__metadata-item",
                 options["locationRegexps"], options["hideJobs"]);
    });
}

var topObserver = null;
var jobsObserver = null;

function createJobsObserver() {
    var targetNode = document.getElementsByClassName(
        "scaffold-layout__list")[0];
    if (! targetNode) {
        return;
    }
    var config = {childList: true, subtree: true};
    var callback = (mutationList, observer) => {
        filterEverything();
    };
    jobsObserver = new MutationObserver(callback);
    jobsObserver.observe(targetNode, config);
    topObserver.disconnect();
    filterEverything();
}

function createTopObserver() {
    var config = {childList: true, subtree: true};
    var callback = (mutationList, observer) => {
        // createJobsObserver();
        filterEverything();
    };
    topObserver = new MutationObserver(callback);
    topObserver.observe(document.body, config);
}

if (! topObserver) {
    createTopObserver();
}
