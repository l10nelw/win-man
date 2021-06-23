const bgColor = 'white';
const textColor = 'black';

export function update(windowId, text) {
    browser.browserAction.setBadgeBackgroundColor({ windowId, color: bgColor });
    browser.browserAction.setBadgeTextColor({ windowId, color: textColor });
    browser.browserAction.setBadgeText({ windowId, text });
}
