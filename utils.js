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
