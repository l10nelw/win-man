async function getTitlePrefaces() {
    const titlePrefaceMap = {};
    const windows = await browser.windows.getAll({ populate: true });
    for (const { id, title, tabs } of windows) {
        const tabTitle = tabs.find(tab => tab.active).title;
        titlePrefaceMap[id] = title.slice(0, title.indexOf(tabTitle));
    }
    return titlePrefaceMap;
}
