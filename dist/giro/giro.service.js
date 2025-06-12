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
var GiroService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GiroService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const schedule_1 = require("@nestjs/schedule");
let GiroService = GiroService_1 = class GiroService {
    prisma;
    logger = new common_1.Logger(GiroService_1.name);
    batchSize = 50;
    updating = false;
    constructor(prisma) {
        this.prisma = prisma;
    }
    canUpdate() {
        return !this.updating;
    }
    async atualizarGiroEmLotes() {
        this.updating = true;
        this.logger.log('Iniciando atualização de giro em lotes...');
        let page = 0;
        let hasMore = true;
        while (hasMore) {
            const produtos = await this.prisma.products.findMany({
                where: { is_active: true },
                include: { quantity_in_stock: true },
                skip: page * this.batchSize,
                take: this.batchSize,
            });
            if (produtos.length === 0) {
                hasMore = false;
                break;
            }
            for (const produto of produtos) {
                const saldoAtual = produto.quantity_in_stock.reduce((acc, item) => acc + item.quantity, 0);
                const entradas = await this.prisma.productsInContainer.findMany({
                    where: { product_ID: produto.ID },
                    orderBy: { ID: 'desc' },
                });
                let soma = 0;
                const ids = [];
                if (saldoAtual === 0 && entradas.length === 1) {
                    soma = entradas[0].quantity;
                    ids.push(entradas[0].ID);
                }
                else {
                    for (const entrada of entradas) {
                        if (soma + entrada.quantity > saldoAtual)
                            break;
                        soma += entrada.quantity;
                        ids.push(entrada.container_ID);
                    }
                }
                let giro = 0;
                if (soma > 0) {
                    if (saldoAtual === 0) {
                        giro = 100;
                    }
                    else if (saldoAtual === soma) {
                        giro = 0;
                    }
                    else {
                        const diff = saldoAtual - soma;
                        giro = Number(((diff / soma) * 100).toFixed(2));
                    }
                }
                await this.prisma.products.update({
                    where: { ID: produto.ID },
                    data: { giro_percentual: giro },
                });
            }
            this.logger.log(`Lote ${page + 1} processado (${produtos.length} produtos).`);
            page++;
        }
        this.updating = false;
        this.logger.log('Atualização de giro finalizada.');
    }
    async atualizarAgoraManual() {
        return await this.atualizarGiroEmLotes();
    }
};
exports.GiroService = GiroService;
__decorate([
    (0, schedule_1.Cron)('0 3 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GiroService.prototype, "atualizarGiroEmLotes", null);
exports.GiroService = GiroService = GiroService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GiroService);
//# sourceMappingURL=giro.service.js.map