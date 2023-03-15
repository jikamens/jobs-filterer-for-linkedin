chrome.runtime.onInstalled.addListener(function (object) {
    if (object.reason == chrome.runtime.OnInstalledReason.INSTALL ||
        object.reason == chrome.runtime.OnInstalledReason.UPDATE)
        chrome.tabs.create({url: "changes.html"});
});
