import { tryRestore as tryRestoreName } from './name.js';

export const infoMap = {};

const compareLastFocused = (a, b) => b.lastFocused - a.lastFocused;
export const sortedInfo = () => Object.values(infoMap).sort(compareLastFocused);

export async function add(windows) {
    const windowIds = [];
    for (const window of windows) {
        const windowId = window.id;
        windowIds.push(windowId);
        infoMap[windowId] = initInfo(window);
    }
    await Promise.all(windowIds.map(tryRestoreName));
}

function initInfo({ id, incognito }) {
    return {
        id,
        incognito,
        created: Date.now(),
        lastFocused: 0,
    };
}

export function remove(windowId) {
    delete infoMap[windowId];
}

export function isOverOne() {
    let count = 0;
    for (const _ in infoMap) {
        if (++count === 2) return true;
    }
    return false;
}