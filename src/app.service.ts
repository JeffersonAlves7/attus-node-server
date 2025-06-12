// src/app.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

interface Pageable {
  page?: number;
  limit?: number;
  orderBy?: string; // Adicionado para ordenação
  orderType?: 'asc' | 'desc'; // Adicionado para tipo de ordenação
}

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  async getProductsWithDaysAndGiro({
    page,
    limit,
    importer,
    code,
    alerta,
    giroMin,
    giroMax,
    orderBy, // Recebe o campo de ordenação
    orderType, // Recebe o tipo de ordenação
  }: {
    code?: string;
    importer?: string;
    alerta?: number;
    giroMin?: number;
    giroMax?: number;
  } & Pageable) {
    if (!page) page = 1;
    if (!limit) limit = 20;
    if (!alerta) alerta = 20;

    // Construindo filtro para giro_percentual direto no banco
    const giroFilter: any = {};
    if (typeof giroMin === 'number') giroFilter.gte = giroMin;
    if (typeof giroMax === 'number') giroFilter.lte = giroMax;

    const whereClause: any = {
      is_active: true,
      ...(importer && {
        importer: importer,
      }),
      ...(code && {
        code: {
          contains: code,
          // mode: 'insensitive', // Adicionado para busca case-insensitive
        },
      }),
      ...(Object.keys(giroFilter).length > 0 && {
        giro_percentual: giroFilter,
      }),
    };

    // Construindo a cláusula de ordenação dinamicamente
    const orderByClause: any = {};
    if (orderBy && orderType) {
      // Mapeia 'codigo' para 'code' no Prisma, se necessário
      const prismaOrderByField = orderBy === 'codigo' ? 'code' : orderBy;
      orderByClause[prismaOrderByField] = orderType.toLowerCase();
    } else {
      orderByClause.ID = 'desc'; // Padrão se nenhum for fornecido
    }

    // 1. Obter a contagem total de produtos que correspondem aos filtros
    const totalCount = await this.prisma.products.count({
      where: whereClause,
    });

    // 2. Obter os IDs de todos os produtos filtrados para somar o estoque total
    const filteredProductIds = (
      await this.prisma.products.findMany({
        where: whereClause,
        select: { ID: true },
      })
    ).map((p) => p.ID);

    // 3. Obter a quantidade total em estoque para todos os produtos filtrados (galpão + loja)
    const totalQuantityInStockResult =
      await this.prisma.quantityInStock.aggregate({
        _sum: { quantity: true },
        where: {
          product_ID: { in: filteredProductIds },
        },
      });
    const totalQuantityInStock = totalQuantityInStockResult._sum.quantity || 0;

    // Pega produtos já filtrados e paginados
    const products = await this.prisma.products.findMany({
      where: whereClause,
      orderBy: orderByClause, // Usa a cláusula de ordenação dinâmica
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

    // Continua o processamento para montar entry, containers e alerta
    for (let product of products) {
      const galpaoStock = product.quantity_in_stock.reduce(
        (prev, current) => ({
          quantity: (prev.quantity ?? 0) + current.quantity,
          quantity_in_reserve:
            (prev.quantity_in_reserve ?? 0) + current.quantity_in_reserve,
        }),
        { quantity: 0, quantity_in_reserve: 0 },
      );

      const saldoAtualGalpao = galpaoStock.quantity;

      const galpaoEntries = await this.prisma.productsInContainer.findMany({
        where: { product_ID: product.ID },
        ...(saldoAtualGalpao === 0 ? { take: 1 } : {}),
        orderBy: { ID: 'desc' },
      });

      let sum = 0;
      let containerIds: number[] = [];

      if (saldoAtualGalpao === 0 && galpaoEntries.length === 1) {
        sum = galpaoEntries[0].quantity;
        containerIds.push(galpaoEntries[0].container_ID);
      } else {
        for (let entry of galpaoEntries) {
          sum += entry.quantity;
          containerIds.push(entry.container_ID);
          if (sum > saldoAtualGalpao) break;
        }
      }

      const containerNames = await this.prisma.loteContainer.findMany({
        where: { ID: { in: containerIds } },
        select: { name: true },
      });

      // @ts-ignore
      product.entry = {
        quantity: sum,
        containers: containerNames.map((v) => v.name).join(','),
      };

      // @ts-ignore
      product.alerta = Math.ceil(sum / alerta);

      // @ts-ignore
      product.daysInStock = (() => {
        if (galpaoEntries.length > 0) {
          const lastEntry = galpaoEntries[galpaoEntries.length - 1];
          const timestamp = new Date(
            lastEntry.updated_at ? lastEntry.updated_at : lastEntry.created_at,
          ).valueOf();

          const now = Date.now();
          return Math.floor((now - timestamp) / (1000 * 60 * 60 * 24));
        }
        return 0;
      })();
    }

    return {
      products: products,
      totalCount: totalCount,
      pageCount: Math.ceil(totalCount / limit),
      totalQuantityInStock: totalQuantityInStock,
    };
  }

  async getProductsWithDaysGalpao({
    page,
    limit,
    importer,
    code,
    alerta,
    orderBy,
    orderType,
  }: {
    code?: string;
    importer?: string;
    alerta?: number;
  } & Pageable) {
    if (!page) page = 1;
    if (!limit) limit = 20;
    if (!alerta) alerta = 20;

    const whereClause: any = {
      is_active: true,
      ...(importer && {
        importer: importer,
      }),
      ...(code && {
        code: {
          contains: code,
        },
      }),
      quantity_in_stock: {
        // Filtra produtos que possuem estoque no galpão (stock_ID = 2)
        some: {
          stock_ID: 2,
          quantity: { gt: 0 }, // Opcional: apenas produtos com quantidade > 0 no galpão
        },
      },
    };

    const orderByClause: any = {};
    if (orderBy && orderType) {
      const prismaOrderByField = orderBy === 'codigo' ? 'code' : orderBy;
      orderByClause[prismaOrderByField] = orderType.toLowerCase();
    } else {
      orderByClause.ID = 'desc';
    }

    // 1. Obter a contagem total de produtos que correspondem aos filtros para o galpão
    const totalCount = await this.prisma.products.count({
      where: whereClause,
    });

    // 2. Obter os IDs de todos os produtos filtrados para somar o estoque total do galpão
    const filteredProductIds = (
      await this.prisma.products.findMany({
        where: whereClause,
        select: { ID: true },
      })
    ).map((p) => p.ID);

    // 3. Obter a quantidade total em estoque para todos os produtos filtrados no galpão (stock_ID = 1)
    const totalQuantityInStockResult =
      await this.prisma.quantityInStock.aggregate({
        _sum: { quantity: true },
        where: {
          product_ID: { in: filteredProductIds },
          stock_ID: 1, // Filtra apenas para o galpão
        },
      });
    const totalQuantityInStock = totalQuantityInStockResult._sum.quantity || 0;

    // Pega produtos já filtrados e paginados
    const products = await this.prisma.products.findMany({
      where: whereClause,
      orderBy: orderByClause,
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

    // Continua o processamento para montar entry, containers e alerta
    for (let product of products) {
      // Encontra o estoque específico do galpão (stock_ID = 1)
      const galpaoStock = product.quantity_in_stock.find(
        (v) => v.stock_ID === 1,
      );
      const saldoAtualGalpao = galpaoStock ? galpaoStock.quantity : 0; // Garante que é 0 se não encontrado

      const galpaoEntries = await this.prisma.productsInContainer.findMany({
        where: { product_ID: product.ID },
        ...(saldoAtualGalpao === 0 ? { take: 1 } : {}),
        orderBy: { ID: 'desc' },
      });

      let sum = 0;
      let containerIds: number[] = [];

      if (saldoAtualGalpao === 0 && galpaoEntries.length === 1) {
        sum = galpaoEntries[0].quantity;
        containerIds.push(galpaoEntries[0].container_ID);
      } else {
        for (let entry of galpaoEntries) {
          sum += entry.quantity;
          containerIds.push(entry.container_ID);
          if (sum > saldoAtualGalpao) break;
        }
      }

      const containerNames = await this.prisma.loteContainer.findMany({
        where: { ID: { in: containerIds } },
        select: { name: true },
      });

      // @ts-ignore
      product.entry = {
        quantity: sum,
        containers: containerNames.map((v) => v.name).join(','),
      };

      // @ts-ignore
      product.alerta = Math.ceil(sum / alerta);

      // @ts-ignore
      product.daysInStock = (() => {
        if (galpaoEntries.length > 0) {
          const lastEntry = galpaoEntries[galpaoEntries.length - 1];
          const timestamp = new Date(
            lastEntry.updated_at ? lastEntry.updated_at : lastEntry.created_at,
          ).valueOf();

          const now = Date.now();
          return Math.floor((now - timestamp) / (1000 * 60 * 60 * 24));
        }
        return 0;
      })();
    }

    return {
      products: products,
      totalCount: totalCount,
      pageCount: Math.ceil(totalCount / limit),
      totalQuantityInStock: totalQuantityInStock,
    };
  }

  async getProductsWithDaysLoja({
    page,
    limit,
    importer,
    code,
    alerta,
    orderBy,
    orderType,
  }: {
    code?: string;
    importer?: string;
    alerta?: number;
  } & Pageable) {
    if (!page) page = 1;
    if (!limit) limit = 20;
    if (!alerta) alerta = 20;

    const whereClause: any = {
      is_active: true,
      ...(importer && {
        importer: importer,
      }),
      ...(code && {
        code: {
          contains: code,
        },
      }),
      quantity_in_stock: {
        // Filtra produtos que possuem estoque na loja (stock_ID = 2)
        some: {
          stock_ID: 2,
          quantity: { gt: 0 }, // Opcional: apenas produtos com quantidade > 0 na loja
        },
      },
    };

    const orderByClause: any = {};
    if (orderBy && orderType) {
      const prismaOrderByField = orderBy === 'codigo' ? 'code' : orderBy;
      orderByClause[prismaOrderByField] = orderType.toLowerCase();
    } else {
      orderByClause.ID = 'desc';
    }

    // 1. Obter a contagem total de produtos que correspondem aos filtros para a loja
    const totalCount = await this.prisma.products.count({
      where: whereClause,
    });

    // 2. Obter os IDs de todos os produtos filtrados para somar o estoque total da loja
    const filteredProductIds = (
      await this.prisma.products.findMany({
        where: whereClause,
        select: { ID: true },
      })
    ).map((p) => p.ID);

    // 3. Obter a quantidade total em estoque para todos os produtos filtrados na loja (stock_ID = 2)
    const totalQuantityInStockResult =
      await this.prisma.quantityInStock.aggregate({
        _sum: { quantity: true },
        where: {
          product_ID: { in: filteredProductIds },
          stock_ID: 2, // Filtra apenas para a loja
        },
      });
    const totalQuantityInStock = totalQuantityInStockResult._sum.quantity || 0;

    // Pega produtos já filtrados e paginados
    const products = await this.prisma.products.findMany({
      where: whereClause,
      orderBy: orderByClause,
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

    // Continua o processamento para montar entry, containers e alerta
    for (let product of products) {
      // Encontra o estoque específico da loja (stock_ID = 1)
      const lojaStock = product.quantity_in_stock.find((v) => v.stock_ID === 1);
      const saldoAtualLoja = lojaStock ? lojaStock.quantity : 0; // Garante que é 0 se não encontrado

      const lojaEntries = await this.prisma.transaction.findMany({
        where: {
          product_ID: product.ID,
          type_ID: 3, // Supondo que 3 é o type_ID para transações de loja relevantes
          from_stock_ID: 1, // Supondo que 1 é o stock_ID de origem para loja
          to_stock_ID: 2, // Supondo que 2 é o stock_ID de destino para loja
        },
        ...(saldoAtualLoja === 0 ? { take: 1 } : {}),
        orderBy: { ID: 'desc' },
      });

      let sum = 0;

      if (saldoAtualLoja === 0 && lojaEntries.length === 1) {
        sum = lojaEntries[0].quantity;
      } else {
        for (let entry of lojaEntries) {
          sum += entry.quantity;
          if (sum > saldoAtualLoja) break;
        }
      }

      // @ts-ignore
      product.entry = {
        quantity: sum,
      };

      // @ts-ignore
      product.alerta = Math.ceil(sum / alerta);

      // @ts-ignore
      product.daysInStock = (() => {
        if (lojaEntries.length > 0) {
          const lastEntry = lojaEntries[lojaEntries.length - 1];
          const timestamp = new Date(
            lastEntry.updated_at ? lastEntry.updated_at : lastEntry.created_at,
          ).valueOf();

          const now = Date.now();
          return Math.floor((now - timestamp) / (1000 * 60 * 60 * 24));
        }
        return 0;
      })();
    }

    return {
      products: products,
      totalCount: totalCount,
      pageCount: Math.ceil(totalCount / limit),
      totalQuantityInStock: totalQuantityInStock,
    };
  }
}
