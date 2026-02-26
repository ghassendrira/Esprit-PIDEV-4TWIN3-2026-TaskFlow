"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePasswordPolicy = validatePasswordPolicy;
function validatePasswordPolicy(password) {
    const errors = [];
    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least 1 lowercase letter');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least 1 uppercase letter');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least 1 number');
    }
    return errors;
}
//# sourceMappingURL=password.policy.js.map