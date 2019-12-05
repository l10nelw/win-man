/*
Edit Mode is activated on two levels, general and row (specific).
General activation governs state that is sustained even while different rows change active status.
*/

import * as Popup from './popup.js';
import * as Omnibar from './omnibar.js';

export let $active = null; // Currently activated row; indicates if popup is in Edit Mode
let $activeInput;
let $rows, lastIndex; // 'Constants' for row.shiftActive(), set in general.activate()
const $editMode = document.getElementById('editMode');
const omnibarText = `Up/Down/Enter to save, Esc to cancel`;


export function handleClick($target) {
    let handled = false;
    if ($target.classList.contains('editBtn')) {
        const $row = $target.$row;
        $row != $active ? activate($row) : done();
        handled = true;
    } else if ($active) {
        $active.$input.focus();
        handled = true;
    }
    return handled;
}

export function activate($row = Popup.$currentWindowRow) {
    $active ? row.deactivate() : general.activate();
    row.activate($row);
}

async function done(saveName = true) {
    const error = saveName ? await trySaveName($activeInput) : 0;
    if (error) return;
    row.deactivate();
    general.deactivate();
}

const general = {

    toggle(yes) {
        const evLi = yes ? 'addEventListener' : 'removeEventListener';
        document[evLi]('keyup', onKeyup);
        document[evLi]('focusout', onFocusout);
        $editMode.checked = yes;
        Omnibar.disable(yes);
        Omnibar.info(yes ? omnibarText : '');
    },

    activate() {
        general.toggle(true);
        Omnibar.showAllRows();
        $rows = Popup.$allWindowRows;
        lastIndex = $rows.length - 1;
    },

    deactivate() {
        general.toggle(false);
        Omnibar.focus();
        $active = null;
    },

};

const row = {

    toggle(yes) {
        $active.classList.toggle('editModeRow', yes);
        $activeInput.readOnly = !yes;
    },

    activate($row) {
        $active = $row;
        $activeInput = $active.$input;
        $activeInput._original = $activeInput.value;
        $activeInput.select();
        row.toggle(true);
    },

    deactivate() {
        row.toggle(false);
    },

    shiftActive(down) {
        const thisIndex = $rows.indexOf($active);
        if (thisIndex == -1) return;
        let newIndex = thisIndex + down;
        if (newIndex < 0) {
            newIndex = lastIndex;
        } else if (newIndex > lastIndex) {
            newIndex = 0;
        }
        activate($rows[newIndex]);
    },

};

const keyResponse = {

    async ArrowDown() {
        const error = await trySaveName($activeInput);
        if (!error) row.shiftActive(1);
    },

    async ArrowUp() {
        const error = await trySaveName($activeInput);
        if (!error) row.shiftActive(-1);
    },

    async Enter() {
        await done();
    },

};

async function onKeyup(event) {
    if (event.target != $activeInput) return;
    const key = event.key;
    if (key in keyResponse) {
        await keyResponse[key]();
    } else if ($activeInput.value != $activeInput._invalid) {
        toggleError($activeInput, false);
    }
}

async function onFocusout(event) {
    if (event.target != $activeInput) return;
    const error = await trySaveName($activeInput);
    if (error) $activeInput.select();
}

async function trySaveName($input) {
    const name = $input.value = $input.value.trim();
    let error = 0;
    if (name !== $input._original) {
        error = await browser.runtime.sendMessage({
            module: 'Metadata',
            prop: 'setName',
            args: [$input._id, name],
        });
    }
    toggleError($input, error);
    return error;
}

function toggleError($input, error) {
    $input.classList.toggle('inputError', error);
    $input._invalid = error ? $input.value : undefined;
    if (error) $input.select();
}
