import { get as getName } from './name.js';

const bgColor = 'white';
const textColor = 'black';

export function update(windowId) {
    browser.browserAction.setBadgeBackgroundColor({ windowId, color: bgColor });
    browser.browserAction.setBadgeTextColor({ windowId, color: textColor });
    browser.browserAction.setBadgeText({ windowId, text: getName(windowId) });
}
