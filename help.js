function hideFirefoxSection() {
    document.getElementById("firefox-permissions").hidden =
        !navigator.userAgent.includes("Firefox");
}

document.addEventListener("DOMContentLoaded", hideFirefoxSection);
