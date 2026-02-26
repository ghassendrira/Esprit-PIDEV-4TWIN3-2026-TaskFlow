"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecoverResetDto = exports.RecoverVerifyDto = exports.RecoverAnswerDto = exports.RecoverGetQuestionsDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class RecoverGetQuestionsDto {
    email;
}
exports.RecoverGetQuestionsDto = RecoverGetQuestionsDto;
__decorate([
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], RecoverGetQuestionsDto.prototype, "email", void 0);
class RecoverAnswerDto {
    question;
    answer;
}
exports.RecoverAnswerDto = RecoverAnswerDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    __metadata("design:type", String)
], RecoverAnswerDto.prototype, "question", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    __metadata("design:type", String)
], RecoverAnswerDto.prototype, "answer", void 0);
class RecoverVerifyDto {
    email;
    answers;
}
exports.RecoverVerifyDto = RecoverVerifyDto;
__decorate([
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], RecoverVerifyDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => RecoverAnswerDto),
    __metadata("design:type", Array)
], RecoverVerifyDto.prototype, "answers", void 0);
class RecoverResetDto {
    recoveryToken;
    newPassword;
}
exports.RecoverResetDto = RecoverResetDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    __metadata("design:type", String)
], RecoverResetDto.prototype, "recoveryToken", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], RecoverResetDto.prototype, "newPassword", void 0);
//# sourceMappingURL=recover.dto.js.map