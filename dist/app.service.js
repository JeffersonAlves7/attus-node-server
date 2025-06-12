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
exports.AppService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("./prisma/prisma.service");
let AppService = class AppService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getProductsWithDaysAndGiro({ page, limit, importer, code, alerta, giroMin, giroMax, }) {
        if (!page)
            page = 1;
        if (!limit)
            limit = 20;
        if (!alerta)
            alerta = 20;
        const giroFilter = {};
        if (typeof giroMin === 'number')
            giroFilter.gte = giroMin;
        if (typeof giroMax === 'number')
            giroFilter.lte = giroMax;
        const whereClause = {
            is_active: true,
            ...(importer && {
                importer: importer,
            }),
            ...(code && {
                code: {
                    contains: code,
                },
            }),
            ...(Object.keys(giroFilter).length > 0 && {
                giro_percentual: giroFilter,
            }),
        };
        const products = await this.prisma.products.findMany({
            where: whereClause,
            orderBy: {
                ID: 'desc',
            },
            include: {
                quantity_in_stock: {
                    orderBy: {
                        ID: 'desc',
                    },
                },
            },
            skip: limit * (page - 1),
            take: limit,
        });
        for (let product of products) {
            const galpaoStock = product.quantity_in_stock.reduce((prev, current) => ({
                quantity: (prev.quantity ?? 0) + current.quantity,
                quantity_in_reserve: (prev.quantity_in_reserve ?? 0) + current.quantity_in_reserve,
            }), { quantity: 0, quantity_in_reserve: 0 });
            const saldoAtualGalpao = galpaoStock.quantity;
            const galpaoEntries = await this.prisma.productsInContainer.findMany({
                where: { product_ID: product.ID },
                ...(saldoAtualGalpao === 0 ? { take: 1 } : {}),
                orderBy: { ID: 'desc' },
            });
            let sum = 0;
            let containerIds = [];
            if (saldoAtualGalpao === 0 && galpaoEntries.length === 1) {
                sum = galpaoEntries[0].quantity;
                containerIds.push(galpaoEntries[0].ID);
            }
            else {
                for (let entry of galpaoEntries) {
                    sum += entry.quantity;
                    containerIds.push(entry.container_ID);
                    if (sum > saldoAtualGalpao)
                        break;
                }
            }
            const containerNames = await this.prisma.loteContainer.findMany({
                where: { ID: { in: containerIds } },
                select: { name: true },
            });
            product.entry = {
                quantity: sum,
                containers: containerNames.map((v) => v.name).join(','),
            };
            product.alerta = Math.ceil(sum / alerta);
            product.daysInStock = (() => {
                if (galpaoEntries.length > 0) {
                    const lastEntry = galpaoEntries[galpaoEntries.length - 1];
                    const timestamp = new Date(lastEntry.updated_at ? lastEntry.updated_at : lastEntry.created_at).valueOf();
                    const now = Date.now();
                    return Math.floor((now - timestamp) / (1000 * 60 * 60 * 24));
                }
                return 0;
            })();
        }
        return products;
    }
    async getProductsWithDaysGalpao({ page, limit, importer, code, alerta, }) {
        if (!page)
            page = 1;
        if (!limit)
            limit = 20;
        if (!alerta)
            alerta = 20;
        const whereClause = {
            is_active: true,
            ...(importer && {
                importer: importer,
            }),
            ...(code && {
                code: {
                    contains: code,
                },
            }),
        };
        const products = await this.prisma.products.findMany({
            where: whereClause,
            orderBy: {
                ID: 'desc',
            },
            include: {
                quantity_in_stock: {
                    orderBy: {
                        ID: 'desc',
                    },
                },
            },
            skip: limit * (page - 1),
            take: limit,
        });
        for (let product of products) {
            const galpaoStock = product.quantity_in_stock.reduce((prev, current) => ({
                quantity: (prev.quantity ?? 0) + current.quantity,
                quantity_in_reserve: (prev.quantity_in_reserve ?? 0) + current.quantity_in_reserve,
            }), { quantity: 0, quantity_in_reserve: 0 });
            const saldoAtualGalpao = galpaoStock.quantity;
            const galpaoEntries = await this.prisma.productsInContainer.findMany({
                where: { product_ID: product.ID },
                ...(saldoAtualGalpao === 0 ? { take: 1 } : {}),
                orderBy: { ID: 'desc' },
            });
            let sum = 0;
            let containerIds = [];
            if (saldoAtualGalpao === 0 && galpaoEntries.length === 1) {
                sum = galpaoEntries[0].quantity;
                containerIds.push(galpaoEntries[0].ID);
            }
            else {
                for (let entry of galpaoEntries) {
                    sum += entry.quantity;
                    containerIds.push(entry.container_ID);
                    if (sum > saldoAtualGalpao)
                        break;
                }
            }
            const containerNames = await this.prisma.loteContainer.findMany({
                where: { ID: { in: containerIds } },
                select: { name: true },
            });
            product.entry = {
                quantity: sum,
                containers: containerNames.map((v) => v.name).join(','),
            };
            product.alerta = Math.ceil(sum / alerta);
            product.daysInStock = (() => {
                if (galpaoEntries.length > 0) {
                    const lastEntry = galpaoEntries[galpaoEntries.length - 1];
                    const timestamp = new Date(lastEntry.updated_at ? lastEntry.updated_at : lastEntry.created_at).valueOf();
                    const now = Date.now();
                    return Math.floor((now - timestamp) / (1000 * 60 * 60 * 24));
                }
                return 0;
            })();
        }
        return products;
    }
    async getProductsWithDaysLoja({ page, limit, importer, code, alerta, }) {
        if (!page)
            page = 1;
        if (!limit)
            limit = 20;
        if (!alerta)
            alerta = 20;
        const whereClause = {
            is_active: true,
            ...(importer && {
                importer: importer,
            }),
            ...(code && {
                code: {
                    contains: code,
                },
            }),
        };
        const products = await this.prisma.products.findMany({
            where: whereClause,
            orderBy: {
                ID: 'desc',
            },
            include: {
                quantity_in_stock: {
                    orderBy: {
                        ID: 'desc',
                    },
                },
            },
            skip: limit * (page - 1),
            take: limit,
        });
        for (let product of products) {
            const lojaStock = product.quantity_in_stock.find((v) => v.stock_ID == 2);
            const saldoAtualLoja = lojaStock.quantity;
            const lojaEntries = await this.prisma.transaction.findMany({
                where: {
                    product_ID: product.ID,
                    type_ID: 3,
                    from_stock_ID: 1,
                    to_stock_ID: 2,
                },
                ...(saldoAtualLoja === 0 ? { take: 1 } : {}),
                orderBy: { ID: 'desc' },
            });
            let sum = 0;
            if (saldoAtualLoja === 0 && lojaEntries.length === 1) {
                sum = lojaEntries[0].quantity;
            }
            else {
                for (let entry of lojaEntries) {
                    sum += entry.quantity;
                    if (sum > saldoAtualLoja)
                        break;
                }
            }
            product.entry = {
                quantity: sum,
            };
            product.alerta = Math.ceil(sum / alerta);
            product.daysInStock = (() => {
                if (lojaEntries.length > 0) {
                    const lastEntry = lojaEntries[lojaEntries.length - 1];
                    const timestamp = new Date(lastEntry.updated_at ? lastEntry.updated_at : lastEntry.created_at).valueOf();
                    const now = Date.now();
                    return Math.floor((now - timestamp) / (1000 * 60 * 60 * 24));
                }
                return 0;
            })();
        }
        return products;
    }
};
exports.AppService = AppService;
exports.AppService = AppService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AppService);
//# sourceMappingURL=app.service.js.map