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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const app_service_1 = require("./app.service");
let AppController = class AppController {
    appService;
    constructor(appService) {
        this.appService = appService;
    }
    products(page, limit, alerta, importer, code, giroMin, giroMax) {
        return this.appService.getProductsWithDaysAndGiro({
            page,
            limit,
            code,
            importer,
            alerta,
            giroMin,
            giroMax,
        });
    }
    productsByStock(stock, page, limit, alerta, importer, code) {
        if (stock == '1' || stock == 'galpao') {
            return this.appService.getProductsWithDaysGalpao({
                alerta: alerta,
                limit: limit,
                page: page,
                code: code,
                importer: importer,
            });
        }
        if (stock == '2' || stock == 'loja') {
            return this.appService.getProductsWithDaysLoja({
                alerta: alerta,
                limit: limit,
                page: page,
                code: code,
                importer: importer,
            });
        }
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)('products'),
    __param(0, (0, common_1.Query)('page', {
        transform(value) {
            if (!value)
                return 1;
            return Number(value);
        },
    })),
    __param(1, (0, common_1.Query)('limit', {
        transform(value) {
            if (!value)
                return 20;
            return Math.min(Number(value), 100);
        },
    })),
    __param(2, (0, common_1.Query)('alerta', {
        transform(value) {
            if (!value)
                return 20;
            return Number(value);
        },
    })),
    __param(3, (0, common_1.Query)('importer')),
    __param(4, (0, common_1.Query)('code')),
    __param(5, (0, common_1.Query)('giroMin', {
        transform(value) {
            if (!value)
                return undefined;
            return Number(value);
        },
    })),
    __param(6, (0, common_1.Query)('giroMax', {
        transform(value) {
            if (!value)
                return undefined;
            return Number(value);
        },
    })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Number, String, String, Number, Number]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "products", null);
__decorate([
    (0, common_1.Get)('products/:stock'),
    __param(0, (0, common_1.Param)('stock', {
        transform(value, metadata) {
            return value.toLowerCase();
        },
    })),
    __param(1, (0, common_1.Query)('page', {
        transform(value) {
            if (!value)
                return 1;
            return Number(value);
        },
    })),
    __param(2, (0, common_1.Query)('limit', {
        transform(value) {
            if (!value)
                return 20;
            return Math.min(Number(value), 100);
        },
    })),
    __param(3, (0, common_1.Query)('alerta', {
        transform(value) {
            if (!value)
                return 20;
            return Number(value);
        },
    })),
    __param(4, (0, common_1.Query)('importer')),
    __param(5, (0, common_1.Query)('code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, Number, String, String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "productsByStock", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [app_service_1.AppService])
], AppController);
//# sourceMappingURL=app.controller.js.map