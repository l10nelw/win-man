import { defaultNameHead, winfoMap } from './window.js';

// [bgColor, textColor]
const unnamedWindowColors = ['black', 'white'];
const namedWindowColors   = ['white', 'black'];

export function update(windowId) {
    const winfo = winfoMap[windowId];
    const name = winfo.givenName;
    const [bgColor, textColor, text] = name && [...namedWindowColors, name] || [...unnamedWindowColors, defaultText(winfo)];
    browser.browserAction.setBadgeBackgroundColor({ windowId, color: bgColor });
    browser.browserAction.setBadgeTextColor({ windowId, color: textColor });
    browser.browserAction.setBadgeText({ windowId, text });
}

const defaultTextIndex = defaultNameHead.length;
const defaultText = winfo => '#' + winfo.defaultName.slice(defaultTextIndex);
