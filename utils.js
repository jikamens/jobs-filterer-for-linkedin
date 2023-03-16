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
