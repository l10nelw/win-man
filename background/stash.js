import * as Name from './name.js';
import * as Action from './action.js';

let HOME_ID;
const ROOT_IDS = new Set(['toolbar_____', 'menu________', 'unfiled_____']);
const nowStashing   = new Set();
const nowUnstashing = new Set();


/* --- INIT --- */

// Identify the stash home's folder id based on settings.
export async function init(SETTINGS) {
    let rootId = SETTINGS.stash_home; // Id of a root folder; may be followed by a marker character indicating that home is a subfolder
    let nodes;
    const isRoot = isRootId(rootId);
    if (isRoot) {
        HOME_ID = rootId;
        nodes = await getChildNodes(rootId);
    } else {
        // Home is subfolder of root folder
        rootId = rootId.slice(0, -1); // Remove marker
        nodes = await getChildNodes(rootId);
        const title = SETTINGS.stash_home_name;
        const folder = findFolderByTitle(nodes, title);
        HOME_ID = folder ? folder.id : (await createFolder(title, rootId)).id;
    }
    if (isRoot && nodes.length && findSeparator(nodes) === -1) { // If home is a root folder, not empty and has no separator
        createNode({ type: 'separator', parentId: HOME_ID });
    }
}

function findSeparator(nodes) {
    for (let i = nodes.length; i--;) { // Reverse iterate
        if (isSeparator(nodes[i])) return i;
    }
    return -1;
}

const findFolderByTitle = (nodes, title) => nodes.find(node => node.title === title && isFolder(node));


/* --- LIST FOLDERS --- */

export const folderMap = new Map();

folderMap.populate = async () => {
    const nodes = await getHomeContents();
    for (let i = nodes.length; i--;) { // Reverse iterate
        const node = nodes[i];
        switch (node.type) {
            case 'separator': return; // Stop at first separator from the end
            case 'folder':
                const { id, title } = node;
                const bookmarkCount = nowUnstashing.has(id) ? 0 : node.children.filter(isBookmark).length;
                folderMap.set(id, { id, title, bookmarkCount });
        }
    }
}

const getHomeContents = async () => (await browser.bookmarks.getSubTree(HOME_ID))[0].children;


/* --- STASH WINDOW --- */

// Turn window/tabs into folder/bookmarks.
// Create folder if nonexistent, save tabs as bookmarks in folder, and close window.
export async function stash(windowId) {
    const name = Name.get(windowId);
    const tabs = await browser.tabs.query({ windowId });
    closeWindow(windowId);
    const folderId = (await getTargetFolder(name)).id;
    nowStashing.add(folderId);
    await saveTabs(tabs, folderId);
    nowStashing.delete(folderId);
}

//For a given name, return matching bookmarkless folder, otherwise return new folder.
async function getTargetFolder(name) {
    const isMapEmpty = !folderMap.size;
    if (isMapEmpty) await folderMap.populate();
    for (const [, folder] of folderMap) {
        if (folder.title === name && !folder.bookmarkCount) return folder; // Existing folder with same name and has no bookmarks
    }
    if (isMapEmpty) folderMap.clear();
    return createFolder(name);
}

async function closeWindow(windowId) {
    await browser.windows.remove(windowId);
    forgetLastClosedWindow(); // Avoid adding to the Recently Closed Windows list unnecessarily
}

async function forgetLastClosedWindow() {
    const sessions = await browser.sessions.getRecentlyClosed({ maxResults: 1 });
    const windowSession = sessions?.[0]?.window;
    if (windowSession) browser.sessions.forgetClosedWindow(windowSession.sessionId);
}

async function saveTabs(tabs, folderId) {
    const count = tabs.length;
    const properties = { parentId: folderId };
    const savingBookmarks = new Array(count);
    for (let i = count; i--;) { // Reverse iteration necessary for bookmarks to be in correct order
        const tab = tabs[i];
        properties.url = Action.deplaceholderize(tab.url);
        properties.title = tab.title;
        savingBookmarks[i] = createNode(properties);
    }
    await Promise.all(savingBookmarks);
}


/* --- UNSTASH WINDOW --- */

// Turn folder/bookmarks into window/tabs.
export async function unstash(nodeId) {
    const node = (await browser.bookmarks.get(nodeId))[0];
    switch (node.type) {
        case 'bookmark':
            // Open in current window; remove bookmark
            const currentWindow = await browser.windows.getLastFocused();
            openTab(node, currentWindow.id, true);
            removeNode(node.id);
            break;
        case 'folder':
            // Create and populate window; remove bookmarks and also folder if emptied
            unstash.info = unstash.createWindow(node);
    }
}

// Create window and let onWindowCreated() in background.js trigger the rest of the unstash process.
unstash.createWindow = async folder => {
    const window = await browser.windows.create();
    return {
        windowId:  window.id,
        initTabId: window.tabs[0].id,
        folderId:  folder.id,
        name:      folder.title,
    };
}

unstash.onWindowCreated = async windowId => {
    const info = await unstash.info;
    if (windowId !== info?.windowId) return;
    delete unstash.info;

    const name = Name.uniquify(Name.validify(info.name), windowId);
    Name.set(windowId, name);

    const folderId = info.folderId;
    nowUnstashing.add(folderId);
    const { bookmarks, isAllBookmarks } = await readFolder(folderId);

    // Handle initial tab
    const firstBookmark = bookmarks.shift();
    removeNode(firstBookmark.id); // If first tab will be focused, ensures address bar bookmark icon appears toggled off
    await replaceInitTab(info, firstBookmark, true);

    // Open tabs and remove nodes
    if (isAllBookmarks) {
        for (const bookmark of bookmarks) {
            openTab(bookmark, windowId, false);
        }
        await browser.bookmarks.removeTree(folderId); // Remove folder and its contents
    } else {
        const removingBookmarks = [];
        for (const bookmark of bookmarks) {
            openTab(bookmark, windowId, false);
            removingBookmarks.push(removeNode(bookmark.id));
        }
        await Promise.all(removingBookmarks); // Remove bookmarks only
    }
    nowUnstashing.delete(folderId);
}

async function readFolder(folderId) {
    const nodes = await getChildNodes(folderId);
    const bookmarks = nodes.filter(isBookmark);
    const isAllBookmarks = !(nodes.length - bookmarks.length);
    return { bookmarks, isAllBookmarks };
}

async function replaceInitTab({ windowId, initTabId }, bookmark, isFocused) {
    await openTab(bookmark, windowId, isFocused);
    browser.tabs.remove(initTabId);
}

// Open tab from bookmark
const openTab = ({ url, title }, windowId, active) => Action.openTab({ discarded: true, url, title, windowId, active });


/* --- */

export const canUnstash = async nodeId =>
    !( isRootId(nodeId) || nowStashing.has(nodeId) || nowUnstashing.has(nodeId) || isSeparator(await getNode(nodeId)) );

const isRootId    = nodeId => ROOT_IDS.has(nodeId);
const isSeparator = node => node.type === 'separator';
const isFolder    = node => node.type === 'folder';
const isBookmark  = node => node.type === 'bookmark';

const getNode = async nodeId => (await browser.bookmarks.get(nodeId))[0];
const getChildNodes = parentId => browser.bookmarks.getChildren(parentId);

const createNode = properties => browser.bookmarks.create(properties);
const createFolder = (title, parentId = HOME_ID) => createNode({ title, parentId });
const removeNode = nodeId => browser.bookmarks.remove(nodeId);
