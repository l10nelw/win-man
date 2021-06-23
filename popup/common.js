import { get as getModifiers } from '../modifier.js';

// Elements of the popup
export const $body = document.body;
export const $otherWindowsList = document.getElementById('otherWindows');
export const $toolbar = $body.querySelector('footer');
export let $currentWindowRow, $otherWindowRows, $allWindowRows;

export function init(data) {
    ({ $currentWindowRow, $otherWindowRows, $allWindowRows } = data);
}

// Forgiving* shorthands for element class methods. (*Silently does nothing if $el is undefined)
export const hasClass = (cls, $el) => $el?.classList.contains(cls);
export const addClass = (cls, $el) => $el?.classList.add(cls);
export const removeClass = (cls, $el) => $el?.classList.remove(cls);
export const toggleClass = (cls, $el, force) => $el?.classList.toggle(cls, force);

// Element type
export const isButton = $el => $el?.tagName === 'BUTTON';
export const isInput = $el => $el?.tagName === 'INPUT';
export const isRow = $el => $el?._id;

// Action attribute utilities
const actionAttr = 'data-action';
export const getActionAttr = $el => $el?.getAttribute(actionAttr);
export const unsetActionAttr = $el => $el?.removeAttribute(actionAttr);
export const getActionElements = ($scope = $body, suffix = '') => $scope.querySelectorAll(`[${actionAttr}]${suffix}`);

// Given a $row or any of its child elements, get the givenName or defaultName.
export function getName($rowElement) {
    const $input = hasClass('input', $rowElement) && $rowElement || $rowElement.$input || $rowElement.$row.$input;
    return $input.value || $input.placeholder;
}

// Gather action parameters from event and $action element. If action and windowId found, send parameters to
// background to request action execution.
export function requestAction(event, $action = event.target) {
    const $row = $action.$row || $action;
    const windowId = $row._id;
    if (!windowId) return;
    const action = getActionAttr($action) || getActionAttr($row);
    if (!action) return;
    browser.runtime.sendMessage({
        action,
        windowId,
        originWindowId: $currentWindowRow._id,
        modifiers: getModifiers(event),
    });
    window.close();
}

export function requestStash(windowId = $currentWindowRow._id) {
    browser.runtime.sendMessage({ stash: windowId });
}

export const getScrollbarWidth = $el => $el.offsetWidth - $el.clientWidth;
