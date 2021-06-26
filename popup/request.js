/* Send messages to the background frame */

import { $currentWindowRow, getActionAttr } from './common.js';
import { get as getModifiers } from '../modifier.js';

// Gather action parameters from event and $action element. Request only if action and windowId found.
export function action(event, $action = event.target) {
    const $row = $action.$row || $action;
    const windowId = $row._id;
    if (!windowId) return;
    const action = getActionAttr($action) || getActionAttr($row);
    if (!action) return;
    browser.runtime.sendMessage({
        action,
        windowId,
        originWindowId: $currentWindowRow._id,
        modifiers: getModifiers(event),
    });
    window.close();
}

export function stash(windowId = $currentWindowRow._id) {
    browser.runtime.sendMessage({ stash: windowId });
}

export function debug() {
    browser.runtime.sendMessage({ debug: true });
}