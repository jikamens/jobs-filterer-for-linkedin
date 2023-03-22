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

const perItemLimit = 8192;

export function valuesAreEqual(value1, value2) {
    if (Array.isArray(value1)) {
        if (!Array.isArray(value2)) return false;
        if (value1.length != value2.length) return false;
        for (var i = 0; i < value1.length; i++)
            if (! valuesAreEqual(value1[i], value2[i])) return false;
        return true;
    }
    if (typeof(value1) == "object") {
        if (typeof(value2) != "object") return false;
        if (Object.keys(value1).length != Object.keys(value2).length)
            return false;
        for (var [key, value] of Object.entries(value1))
            if (! valuesAreEqual(value, value2[key])) return false;
        return true;
    }
    return value1 == value2;
}

export async function saveListToStorage(name, items) {
    var oldOptions = await chrome.storage.sync.get();
    var perItemSize = perItemLimit * 0.9;  // 10% slack
    var totalLength = JSON.stringify(items).length;
    var numberOfFragments = Math.ceil(totalLength / perItemSize);
    var itemsPerFragment = Math.ceil(items.length / numberOfFragments);
    var options = {};
    for (var i = 0; i < numberOfFragments; i++) {
        var key = `${name}${i}`;
        var start = itemsPerFragment * i;
        var end = start + itemsPerFragment;
        options[key] = items.slice(start, end);
    }
    await chrome.storage.sync.set(options);
    var toRemove = [];
    if (oldOptions[name] != undefined)
        toRemove.push(name);
    while (oldOptions[`${name}${i}`] != undefined) {
        toRemove.push(`${name}${i}`);
        i++;
    }
    if (toRemove.length)
        await chrome.storage.sync.remove(toRemove);
}

export async function readListFromStorage(name) {
    var options = await chrome.storage.sync.get();
    // Backward compatibility 2023-03-22
    if (options[name] != undefined)
        return options[name];
    var items = [];
    for (var i = 0; options[`${name}${i}`] != undefined; i++)
        items = items.concat(options[`${name}${i}`])
    return items;
}
