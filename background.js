chrome.runtime.onInstalled.addListener(function (object) {
    chrome.storage.sync.get(["showChanges"]).then((options) => {
        if ((options["showChanges"] === undefined ||
             options["showChanges"]) &&
            (object.reason == chrome.runtime.OnInstalledReason.INSTALL ||
             object.reason == chrome.runtime.OnInstalledReason.UPDATE))
            chrome.tabs.create({url: "changes.html"});
    })
});
