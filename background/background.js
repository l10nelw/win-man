import * as Settings from './settings.js';
import * as Window from './window.js';
import * as Action from './action.js';
let Stash, Menu; // Optional modules

init();
Settings.needsRestart(false);
browser.runtime.onInstalled.addListener    (onExtInstalled);
browser.windows.onCreated.addListener      (onWindowCreated);
browser.windows.onRemoved.addListener      (onWindowRemoved);
browser.windows.onFocusChanged.addListener (onWindowFocused);
browser.runtime.onMessage.addListener      (onRequest);

async function init() {
    const [windows, SETTINGS] = await Promise.all([ browser.windows.getAll(), Settings.retrieve() ]);

    Action.init(SETTINGS);

    if (SETTINGS.enable_stash) {
        Stash = await import('./stash.js');
        Stash.init(SETTINGS);
    }

    await Window.init(SETTINGS, windows);
    for (const window of windows) onWindowCreated(window, true);

    const menusEnabled = [];
    if (SETTINGS.enable_tab_menu)  menusEnabled.push('tab');
    if (SETTINGS.enable_link_menu) menusEnabled.push('link');
    if (SETTINGS.enable_stash)     menusEnabled.push('bookmark');
    if (menusEnabled.length) {
        Menu = await import('./menu.js');
        Menu.init(menusEnabled);
    }

    // Object.assign(window, { Window, Action, Stash });
}

function onExtInstalled(details) {
    if (details.reason === 'install') Action.openHelp();
}

async function onWindowCreated(window, isInit) {
    const windowId = window.id;
    if (window.focused) onWindowFocused(windowId);

    if (isInit) return;

    await Window.add(window);
    Menu?.update();
    Stash?.unstash.onWindowCreated(windowId);
    Action.selectFocusedTab(windowId);
}

function onWindowRemoved(windowId) {
    Window.remove(windowId);
    Menu?.update();
}

function onWindowFocused(windowId) {
    if (isWindowBeingCreated(windowId)) return;
    Window.winfoMap[windowId].lastFocused = Date.now();
}

const isWindowBeingCreated = windowId => !(windowId in Window.winfoMap);

async function onRequest(request) {

    // From popup/init.js
    if (request.popupError) return debug();
    if (request.popup) {
        return {
            SETTINGS:         Settings.SETTINGS,
            winfos:            Window.sorted(),
            selectedTabCount: (await Action.getSelectedTabs()).length,
        };
    }

    // From popup/popup.js
    if (request.stash) return Stash.stash(request.stash);
    if (request.action) return Action.execute(request);
    if (request.help) return Action.openHelp();

    // From popup/editmode.js
    if (request.giveName) return Window.giveName(request.windowId, request.name);
}

function debug() {
    Object.assign(window, { Window });
    console.log(Window.winfoMap);
}