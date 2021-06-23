import { getShortcut } from '../utils.js';

export async function update(windowId, name) {
    const titlePreface = `${name} - `;

    // Titlebar
    browser.windows.update(windowId, { titlePreface });

    // Button tooltip
    const title = `${titlePreface}${browser.runtime.getManifest().name} (${await getShortcut()})`;
    browser.browserAction.setTitle({ windowId, title });
}