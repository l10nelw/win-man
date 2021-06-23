import { infoMap as WinfoMap } from './window.js';
import { onWindowNamed } from './background.js';

const DEFAULT_HEAD = '#';
const NUMBER_POSTFIX = / (\d+)$/;

// Restore window's givenName, else if unsuccessful, give it a default one.
export async function tryRestore(windowId) {
    let name = await browser.sessions.getWindowValue(windowId, 'givenName');
    name = name ? uniquify(name) : createDefault();
    WinfoMap[windowId].givenName = name;
    onWindowNamed(windowId, name);
}

export function get(windowId) {
    return WinfoMap[windowId].givenName;
}

// Validate and store name for target window. Return 0 if successful, otherwise return -1 or id of conflicting window.
// If name is blank, create and store a default one.
export function set(windowId, name) {
    if (name) {
        if (isInvalid(name)) return -1;
        const conflictId = has(name, windowId);
        if (conflictId) return conflictId;
    }
    else name = createDefault();
    WinfoMap[windowId].givenName = name;
    browser.sessions.setWindowValue(windowId, 'givenName', name);
    onWindowNamed(windowId, name);
    return 0;
}

function createDefault() {
    let name;
    let number = 0;
    do {
        name = `${DEFAULT_HEAD}${++number}`;
    } while (has(name));
    return name;
}

function isInvalid(name) {
    return name.startsWith('/');
}

// Remove spaces and illegal characters from name.
export function validify(name) {
    name = name.trim();
    return name.startsWith('/') ? validify(name.slice(1)) : name;
}

// If name is not unique, add number postfix to it.
// Check against all windows except window of excludeId.
export function uniquify(name, excludeId) {
    return has(name, excludeId) ? uniquify(applyNumberPostfix(name)) : name;
}

// Find window with given name, skipping window with id of excludeId. Return id of matching window, otherwise return 0.
export function has(name, excludeId) {
    for (const id in WinfoMap) {
        if (id == excludeId) continue;
        if (WinfoMap[id].givenName === name) return id;
    }
    return 0;
}

// Add " 2" at the end of name, or increment an existing number postfix.
function applyNumberPostfix(name) {
    const found = name.match(NUMBER_POSTFIX);
    return found ? `${name.slice(0, found.index)} ${Number(found[1]) + 1}` : `${name} 2`;
}
