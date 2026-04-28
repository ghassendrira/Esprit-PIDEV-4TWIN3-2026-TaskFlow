"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentCompanyId = void 0;
const common_1 = require("@nestjs/common");
exports.CurrentCompanyId = (0, common_1.createParamDecorator)((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.company_id;
});
//# sourceMappingURL=current-company-id.decorator.js.map