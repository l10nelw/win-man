import { hasName } from './window.js';

// const defaultPattern = /^Window \d+$/;
const numberPostfix = / (\d+)$/;

export function isInvalid(str) {
    return str.startsWith('/');
}

// Remove spaces and illegal characters from str.
export function validify(str) {
    str = str.trim();
    return str.startsWith('/') ? validify(str.slice(1)) : str;
}

// If window name str is not unique, add number postfix to it.
// Supply excludeId to skip a particular window to check against.
export function uniquify(str, excludeId) {
    return hasName(str, excludeId) ? uniquify(applyNumberPostfix(str)) : str;
}

// Add " 2" at the end of str, or increment an existing " number".
export function applyNumberPostfix(str) {
    const found = str.match(numberPostfix);
    return found ? `${str.slice(0, found.index)} ${Number(found[1]) + 1}` : `${str} 2`;
}
