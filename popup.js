'use strict';

const $currentWindowRow = document.getElementById('currentWindow');
const $searchInput = document.getElementById('searchInput');
const $windowList = document.getElementById('windowList');
const $editMode = document.getElementById('editMode');
const $rowTemplate = document.getElementById('rowTemplate').content.firstElementChild;

let metaWindows;

const port = browser.runtime.connect({ name: 'popup' });
port.onMessage.addListener(handleMessage);
$windowList.addEventListener('click', onClickRow);
$searchInput.addEventListener('keyup', onSearchInput);

function handleMessage(message) {
    switch (message.response) {
        case 'popup open': {
            metaWindows = message.metaWindows;
            const focusedWindowId = message.focusedWindowId;
            const sortedIds = message.sortedIds;
            for (const windowId of sortedIds) {
                const metaWindow = metaWindows[windowId];
                windowId == focusedWindowId ? populateRow($currentWindowRow, metaWindow) : addRow(metaWindow);
            }
        }
    }
}

function addRow(metaWindow) {
    const $row = document.importNode($rowTemplate, true);
    populateRow($row, metaWindow);
    $windowList.appendChild($row);
}

function populateRow($row, metaWindow) {
    $row.$input = $row.querySelector('input');
    $row.$badge = $row.querySelector('.badge');
    $row.$input.value = metaWindow.displayName;
    $row.$badge.textContent = metaWindow.tabCount;
    $row._id = metaWindow.id;
}

function onClickRow(event) {
    if ($editMode.checked) return;
    const $target = event.target;
    const $row = $target.closest('tr');
    if ($row) {
        respondWithBrowserOp(event, $row._id, !!$target.closest('.actionSendTabs'));
    }
}

function onSearchInput(event) {
    const string = $searchInput.value;
    const $firstMatch = filterWindowNames(string);
    if ($editMode.checked) return;
    if (event.key == 'Enter' && $firstMatch) {
        respondWithBrowserOp(event, $firstMatch._id);
    }
}

// Hide rows whose names do not contain string. Returns first matching row or null.
function filterWindowNames(string) {
    const $rows = $windowList.rows;
    let $firstMatch;
    if (string) {
        for (const $row of $rows) {
            const isMatch = $row.$input.value.includes(string);
            $row.hidden = !isMatch;
            $firstMatch = $firstMatch || (isMatch ? $row : null); // if not already found, it's this row
        }
    } else {
        for (const $row of $rows) {
            $row.hidden = false;
        }
        $firstMatch = $rows[0];
    }
    return $firstMatch;
}

function respondWithBrowserOp(event, windowId, sendTabsByDefault) {
    port.postMessage({
        command: true,
        module: 'BrowserOp',
        prop: 'respond',
        args: [windowId, eventModifiers(event), sendTabsByDefault],
    });
    window.close();
}

function eventModifiers(event) {
    let modifiers = [];
    for (const prop in event) {
        if (prop.endsWith('Key') && event[prop]) {
            let modifier = prop[0].toUpperCase() + prop.slice(1, -3);
            modifiers.push(modifier);
        }
    }
    return modifiers;
}
