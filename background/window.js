import * as Name from './name.js';
import { onWindowNamed } from './background.js';

export const winfoMap = {};

export const defaultNameHead = 'Window ';
let lastWindowNumber = 0;

export const sortedWinfos = () => Object.values(winfoMap).sort(compareLastFocused);
const compareLastFocused = (a, b) => b.lastFocused - a.lastFocused;

export async function add(windows) {
    const windowIds = [];
    for (const window of windows) {
        const windowId = window.id;
        windowIds.push(windowId);
        winfoMap[windowId] = createWinfo(window);
        winfoMap[windowId].defaultName = createDefaultName(windowId);
    }
    await Promise.all(windowIds.map(restoreGivenName));
}

export function remove(windowId) {
    delete winfoMap[windowId];
}

function createWinfo({ id, incognito }) {
    return {
        id,
        incognito,
        created: Date.now(),
        lastFocused: 0,
    };
}

async function restoreGivenName(windowId) {
    const givenName = await browser.sessions.getWindowValue(windowId, 'givenName');
    winfoMap[windowId].givenName = givenName ? Name.uniquify(givenName) : '';
    onWindowNamed(windowId);
}

function createDefaultName(windowId) {
    let name;
    do {
        name = defaultNameHead + (++lastWindowNumber);
    } while (hasName(name, windowId));
    return name;
}

export function getName(windowId) {
    const winfo = winfoMap[windowId];
    return winfo.givenName || winfo.defaultName;
}

// Validate and store givenName for target window.
// Returns 0 if successful, otherwise returns -1 or id of conflicting window.
export function giveName(windowId, name) {
    if (name !== '') {
        if (Name.isInvalid(name)) return -1;
        const conflictId = hasName(name, windowId);
        if (conflictId) return conflictId;
    }
    winfoMap[windowId].givenName = name;
    browser.sessions.setWindowValue(windowId, 'givenName', name);
    onWindowNamed(windowId);
    return 0;
}

// Check if name conflicts with any windows, except with given excludeId.
// Returns id of conflicting window, otherwise returns 0.
export function hasName(name, excludeId) {
    for (const id in winfoMap) {
        if (id == excludeId) continue;
        const winfo = winfoMap[id];
        if (winfo.givenName === name || winfo.defaultName === name) return id;
    }
    return 0;
}

export function isOverOne() {
    let count = 0;
    for (const _ in winfoMap) {
        if (++count === 2) return true;
    }
    return false;
}
