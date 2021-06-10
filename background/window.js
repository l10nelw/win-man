import * as Name from './name.js';
import * as Title from './title.js';
let Badge;

// An info-about-a-window object is called a "winfo". "Winfos" live here, acting as Winger's source-of-truth.
export const winfoMap = {};

export const defaultNameHead = 'Window ';
let lastWindowNumber = 0;

export const sortedWinfos = () => Object.values(winfoMap).sort(compareLastFocused);
const compareLastFocused = (a, b) => b.lastFocused - a.lastFocused;

export async function init(SETTINGS, windows) {
    if (SETTINGS.show_badge) Badge = await import('./badge.js');

    // Perform equivalent of add() for every open window all at once.
    let windowIds = [];
    for (const window of windows) {
        const windowId = window.id;
        windowIds.push(windowId);
        winfoMap[windowId] = createWinfo(window);
    }
    await nameWinfos(windowIds);
}

export async function add(window) {
    const windowId = window.id;
    if (windowId in winfoMap) return;
    winfoMap[windowId] = createWinfo(window);
    await nameWinfos([windowId]);
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

async function nameWinfos(windowIds) {
    await Promise.all(windowIds.map(restoreGivenName));
    for (const windowId of windowIds) {
        winfoMap[windowId].defaultName = createDefaultName(windowId);
        onWindowNamed(windowId);
    }
}

async function restoreGivenName(windowId) {
    const givenName = await browser.sessions.getWindowValue(windowId, 'givenName');
    winfoMap[windowId].givenName = givenName ? Name.uniquify(givenName) : '';
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

function onWindowNamed(windowId) {
    Title.update(windowId);
    Badge?.update(windowId);
}

export function isOverOne() {
    let count = 0;
    for (const _ in infoMap) {
        if (++count === 2) return true;
    }
    return false;
}
