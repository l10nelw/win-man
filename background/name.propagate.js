// Update window name displayed across browser UI.

import * as Title from './title.js';
let Badge;

export async function init(SETTINGS) {
    if (SETTINGS.show_badge) Badge = await import('./badge.js');
}

export function propagate(windowId) {
    Title.update(windowId);
    Badge?.update(windowId);
}
