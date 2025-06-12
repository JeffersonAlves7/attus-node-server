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
exports.GiroController = void 0;
const common_1 = require("@nestjs/common");
const giro_service_1 = require("./giro.service");
let GiroController = class GiroController {
    giroService;
    constructor(giroService) {
        this.giroService = giroService;
    }
    updateGiro() {
        if (this.giroService.canUpdate()) {
            this.giroService.atualizarAgoraManual();
            return 'Atualizando giro!';
        }
        else {
            return 'Não é possível atualizar no momento';
        }
    }
};
exports.GiroController = GiroController;
__decorate([
    (0, common_1.Get)('/update'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], GiroController.prototype, "updateGiro", null);
exports.GiroController = GiroController = __decorate([
    (0, common_1.Controller)('giro'),
    __metadata("design:paramtypes", [giro_service_1.GiroService])
], GiroController);
//# sourceMappingURL=giro.controller.js.map