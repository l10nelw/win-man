import * as Settings from './settings.js';
import * as Window from './window.js';
import { set as setName } from './name.js';
import * as Action from './action.js';
import * as Title from './title.js';
let Badge, Stash, Menu; // Optional modules

init();
Settings.needsRestart(false);
browser.runtime.onInstalled.addListener    (onExtensionInstalled);
browser.windows.onCreated.addListener      (onWindowCreated);
browser.windows.onRemoved.addListener      (onWindowRemoved);
browser.windows.onFocusChanged.addListener (onWindowFocused);
browser.runtime.onMessage.addListener      (onRequest);

async function init() {
    const [SETTINGS, windows] = await Promise.all([ Settings.retrieve(), browser.windows.getAll() ]);

    Action.init(SETTINGS);

    if (SETTINGS.show_badge) {
        import('./badge.js').then(module => {
            Badge = module;
        });
    }
    if (SETTINGS.enable_stash) {
        import('./stash.js').then(module => {
            Stash = module;
            Stash.init(SETTINGS);
        });
    }
    const menusEnabled = [];
    if (SETTINGS.enable_tab_menu)  menusEnabled.push('tab');
    if (SETTINGS.enable_link_menu) menusEnabled.push('link');
    if (SETTINGS.enable_stash)     menusEnabled.push('bookmark');
    if (menusEnabled.length) {
        import('./menu.js').then(module => {
            Menu = module;
            Menu.init(menusEnabled);
        });
    }

    await Window.add(windows);
    for (const window of windows) onWindowCreated(window, true);
}

function onExtensionInstalled(details) {
    if (details.reason === 'install') Action.openHelp();
}

async function onWindowCreated(window, isInit) {
    const windowId = window.id;
    if (window.focused) onWindowFocused(windowId);

    if (isInit) return;

    await Window.add([window]);
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
            winfos:            Window.sortedWinfos(),
            selectedTabCount: (await Action.getSelectedTabs()).length,
        };
    }

    // From popup/popup.js
    if (request.stash) return Stash.stash(request.stash);
    if (request.action) return Action.execute(request);
    if (request.help) return Action.openHelp();

    // From popup/editmode.js
    if (request.giveName) return setName(request.windowId, request.name);
}

export function onWindowNamed(windowId) {
    Title.update(windowId);
    Badge?.update(windowId);
}

function debug() {
    Object.assign(window, { Window });
    console.log(Window.winfoMap);
}