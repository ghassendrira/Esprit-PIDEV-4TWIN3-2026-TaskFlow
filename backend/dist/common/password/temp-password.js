"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTemporaryPassword = generateTemporaryPassword;
const crypto_1 = require("crypto");
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGIT = '0123456789';
const ALL = LOWER + UPPER + DIGIT;
function pick(chars) {
    return chars[(0, crypto_1.randomInt)(0, chars.length)];
}
function generateTemporaryPassword(length = 12) {
    const chars = [pick(LOWER), pick(UPPER), pick(DIGIT)];
    while (chars.length < length) {
        chars.push(pick(ALL));
    }
    for (let i = chars.length - 1; i > 0; i--) {
        const j = (0, crypto_1.randomInt)(0, i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join('');
}
//# sourceMappingURL=temp-password.js.map