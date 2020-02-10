import { hasClass, getModifiers, end } from '../utils.js';
import * as Popup from './popup.js';
import * as Status from './status.js';

let bring_modifier, send_modifier, EditTooltips, Tooltips, $lastTarget;

export function generate(tabCount, hasReopenTab) {
    ( { bring_modifier, send_modifier } = Popup.OPTIONS );
    const tabPhrase = tabCount == 1 ? '1 tab' : `${tabCount} tabs`;

    EditTooltips = {
        doneEdit: {
            text: `Save and exit Edit Mode`,
            match: ($target, $row) => hasClass('editModeRow', $row) && hasClass('editBtn', $target),
        },
        edit: {
            text: `Edit: `,
            match: ($target) => hasClass('editBtn', $target),
        },
    };

    const ReopenTooltips = hasReopenTab ? {
        bringReopenTab: {
            text: `Bring (close-reopen) ${tabPhrase} to: `,
            match: ($target, $otherRow, doBringTab, doSendTab) =>
                hasClass('reopenTab', $otherRow) && (doBringTab || !doSendTab && hasClass('bringBtn', $target)),
        },
        sendReopenTab: {
            text: `Send (close-reopen) ${tabPhrase} to: `,
            match: ($target, $otherRow, _, doSendTab) =>
                hasClass('reopenTab', $otherRow) && (doSendTab || hasClass('sendBtn', $target)),
        },
    } : null;

    Tooltips = {
        ...ReopenTooltips,
        bringTab: {
            text: `Bring ${tabPhrase} to: `,
            match: ($target, $otherRow, doBringTab, doSendTab) =>
                doBringTab && $otherRow || !doSendTab && hasClass('bringBtn', $target),
        },
        sendTab: {
            text: `Send ${tabPhrase} to: `,
            match: ($target, $otherRow, _, doSendTab) => doSendTab && $otherRow || hasClass('sendBtn', $target),
        },
        switch: {
            text: `Switch to: `,
            match: (_, $otherRow) => $otherRow,
        }
    };
}

// Show tooltip based on event.
// A modifer array may be given instead of event to include relevant modifier text in the tooltip.
export function show(event) {
    let modifiers;
    let $target = event.target;
    if ($target) {
        // event given
        $lastTarget = $target;
    } else {
        // array given
        $target = $lastTarget;
        modifiers = event;
    }
    if (!$target || !$target.closest('.action')) return Status.show();
    let text = select(EditTooltips, $target, $target.$row);
    if (!text) {
        modifiers = modifiers || getModifiers(event);
        const $otherRow = $target.closest('.otherRow');
        const doBringTab = modifiers.includes(bring_modifier);
        const doSendTab  = modifiers.includes(send_modifier);
        text = select(Tooltips, $target, $otherRow, doBringTab, doSendTab);
        const modifierText = doBringTab ? `[${bring_modifier}] ` : doSendTab ? `[${send_modifier}] ` : ``;
        text = modifierText + text;
    }
    if (end(text) == ' ') text += Popup.rowName($target.$row || $target);
    Status.show(text);
    $target.title = text;
}

// Select tooltip from a dict based on args.
function select(tooltipDict, ...args) {
    for (const action in tooltipDict) {
        const tooltip = tooltipDict[action];
        if (tooltip.match(...args)) return tooltip.text;
    }
}