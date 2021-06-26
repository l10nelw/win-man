import { BRING } from '../modifier.js';
import * as Window from './window.js';
import * as Action from './action.js';

const enabledContexts = [];

const menuId = (context, windowId = '') => `${windowId}-${context}`;

export function init(context) {
    enabledContexts.push(context);
    addDummy(context);
}

// Add dummy submenu item to avoid parent menu resizing onShown.
function addDummy(context) {
    browser.menus.create({
        contexts: [context],
        parentId: context,
        id: menuId(context),
        title: '-',
    });
}

export function handleShow(info, tab) {
    const contexts = info.contexts;
    const context =
        contexts.includes('bookmark') ? null :
        contexts.includes('link') ? 'link' :
        contexts.includes('tab') ? 'tab' :
        null;
    if (!context) return;
    if (enabledContexts.includes(context)) {
        populate(context, tab.windowId);
        return true;
    }
}

export function handleClick(info, tab) {
    const windowId = parseInt(info.menuItemId);
    if (!windowId) return;
    const url = info.linkUrl;
    url ? openLink (url, windowId, info.modifiers)
        : moveTab  (tab, windowId, info.modifiers, tab.windowId);
    return true;
}

// Update menu's enabled state based on window count.
export function updateAvailability() {
    const properties = { enabled: Window.windowCount > 1 };
    for (const context of enabledContexts) browser.menus.update(context, properties);
}

// Clear and populate `context` menu with other-window menu items, sorted by lastFocsued.
function populate(context, currentWindowId) {
    const properties = { contexts: [context], parentId: context };
    for (const { id: windowId } of Window.sorted()) {
        const id = menuId(context, windowId);
        browser.menus.remove(id);
        if (windowId === currentWindowId) continue;
        browser.menus.create({ ...properties, id, title: Window.getName(windowId) });
    }
    browser.menus.remove(menuId(context)); // Remove dummy if it exists
    browser.menus.refresh();
}

function openLink(url, windowId, modifiers) {
    browser.tabs.create({ windowId, url });
    if (modifiers.includes(BRING)) Action.switchWindow(windowId);
}

async function moveTab(tab, windowId, modifiers, originWindowId) {
    const tabs = tab.highlighted ? await Action.getSelectedTabs() : [tab];
    Action.execute({ action: 'send', windowId, originWindowId, modifiers, tabs });
}