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
  constructor(private prisma: PrismaService) { }

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
        },
      }),
      ...(Object.keys(giroFilter).length > 0 && {
        giro_percentual: giroFilter,
      }),
      products_in_container: {
        some: {
          in_stock: true,
        },
      },
    };

    // Construindo a cláusula de ordenação dinamicamente
    const orderByClause: any = {};
    if (orderBy && orderType) {
      // Mapeia 'codigo' para 'code' no Prisma, se necessário
      const prismaOrderByField = orderBy === 'codigo' ? 'code' : orderBy;
      orderByClause[prismaOrderByField] = orderType.toLowerCase();
    } else {
      orderByClause.code = 'asc'; // Padrão se nenhum for fornecido
    }

    // 1. Obter a contagem total de produtos que correspondem aos filtros
    const totalCount = await this.prisma.products.count({
      where: whereClause,
    });

    // 2. Obter a soma das quantidades de estoque por produto
    const stockSums = await this.prisma.quantityInStock.groupBy({
      by: ['product_ID'],
      _sum: {
        quantity: true, // Soma das quantidades de estoque
      },
      where: {
        product_ID: {
          in: (
            await this.prisma.products.findMany({
              where: whereClause,
              select: { ID: true },
            })
          ).map((p) => p.ID),
        },
      },
    });

    // 3. Criar um mapa das somas de estoque por product_ID
    const stockMap = new Map<number, number>();
    stockSums.forEach((item) => {
      stockMap.set(item.product_ID, item._sum.quantity || 0); // Adiciona a soma do estoque
    });

    // 4. Obter os IDs dos produtos ordenados pela soma de estoque
    const sortedStock = stockSums.sort((a, b) => {
      const stockA = a._sum.quantity || 0;
      const stockB = b._sum.quantity || 0;
      return orderType === 'asc' ? stockA - stockB : stockB - stockA;
    });

    // 5. Pegando os IDs dos produtos com base na ordenação
    const ids = sortedStock.slice(limit * (page - 1), limit * page).map((item) => item.product_ID);

    // 6. Obter os produtos com a ordenação pela soma do estoque
    const products = await this.prisma.products.findMany({
      where: {
        ID: {
          in: ids,
        },
      },
      orderBy: orderByClause, // Usa a cláusula de ordenação dinâmica
      include: {
        quantity_in_stock: {
          orderBy: {
            ID: 'desc',
          },
        },
      },
    });

    // 7. Obter a quantidade total em estoque para todos os produtos filtrados
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

    // 8. Continua o processamento para montar entry, containers e alerta
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

      let galpaoEntries = await this.prisma.productsInContainer.findMany({
        where: { product_ID: product.ID, in_stock: true },
        ...(saldoAtualGalpao === 0 ? { take: 1 } : {}),
        orderBy: { ID: 'desc' },
      });

      let sum = 0;
      let realEntries: Array<{ ID: number, container_ID: number, updated_at: Date, created_at: Date }> = []

      if (saldoAtualGalpao === 0 && galpaoEntries.length === 1) {
        sum = galpaoEntries[0].quantity;
        realEntries.push(galpaoEntries[0]);
      } else {
        for (let entry of galpaoEntries) {
          sum += entry.quantity;
          realEntries.push(entry);
          if (sum > saldoAtualGalpao) break;
        }
      }

      const containerNames = await this.prisma.loteContainer.findMany({
        where: { ID: { in: realEntries.map(v => v.container_ID) } },
        select: { name: true },
      });

      // @ts-ignore
      product.entry = {
        quantity: sum,
        containers: containerNames.map((v) => v.name).join(','),
      };

      // @ts-ignore
      product.alerta = Math.ceil((alerta / 100) * sum);

      // @ts-ignore
      product.entryDate = null

      // @ts-ignore
      product.daysInStock = 0
      if (realEntries.length > 0) {
        const lastEntry = realEntries[0]
        // @ts-ignore
        product.entryDate = new Date(lastEntry.updated_at)

        // @ts-ignore
        const timestamp = product.entryDate.valueOf();

        const now = Date.now();
        // @ts-ignore
        product.daysInStock = Math.floor((now - timestamp) / (1000 * 60 * 60 * 24));
      }
    }

    return {
      products,
      totalCount,
      pageCount: Math.ceil(totalCount / limit),
      totalQuantityInStock,
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
      products_in_container: {
        some: {
          in_stock: true,
        },
      },
    };

    const orderByClause: any = {};
    if (orderBy && orderType) {
      const prismaOrderByField = orderBy === 'codigo' ? 'code' : orderBy;
      orderByClause[prismaOrderByField] = orderType.toLowerCase();
    } else {
      orderByClause.code = 'asc';
    }

    // 1. Obter a contagem total de produtos que correspondem aos filtros
    const totalCount = await this.prisma.products.count({
      where: whereClause,
    });

    // 2. Obter os IDs de todos os produtos filtrados para somar o estoque total do galpão (stock_ID = 1)
    const filteredProductIds = (
      await this.prisma.products.findMany({
        where: whereClause,
        select: { ID: true },
      })
    ).map((p) => p.ID);

    // 3. Obter a soma das quantidades de estoque para todos os produtos filtrados no galpão (stock_ID = 1)
    const stockSums = await this.prisma.quantityInStock.groupBy({
      by: ['product_ID'],
      _sum: {
        quantity: true, // Soma das quantidades de estoque
      },
      where: {
        product_ID: { in: filteredProductIds },
        stock_ID: 1, // Filtra apenas para o galpão
      },
    });

    // 4. Criar um mapa das somas de estoque por product_ID
    const stockMap = new Map<number, number>();
    let totalQuantityInStock = 0; // Initialize the total quantity of stock

    stockSums.forEach((item) => {
      const quantity = item._sum.quantity || 0;
      stockMap.set(item.product_ID, quantity); // Adiciona a soma do estoque
      totalQuantityInStock += quantity; // Add to the total quantity in stock
    });

    // Ordenar produto com estoque somado do menor para o maior (ou maior para menor, dependendo do orderType)
    const sortedStock = stockSums.sort((a, b) => {
      const stockA = a._sum.quantity || 0;
      const stockB = b._sum.quantity || 0;

      // Se o orderType for 'asc', queremos o estoque menor primeiro (menor para maior)
      if (orderType === 'asc') {
        return stockA - stockB; // A ordenação é feita de menor para maior
      } else {
        return stockB - stockA; // Caso contrário, maior para menor
      }
    });

    // 5. Pegando os IDs dos produtos com base na ordenação do estoque
    const ids = sortedStock.slice(limit * (page - 1), limit * page).map((item) => item.product_ID);

    // 6. Obter os produtos já filtrados e paginados, agora ordenados pela quantidade em estoque
    const products = await this.prisma.products.findMany({
      where: {
        ID: {
          in: ids,
        },
      },
      orderBy: orderByClause, // Usa a cláusula de ordenação
      include: {
        quantity_in_stock: {
          orderBy: {
            ID: 'desc',
          },
        },
      },
    });

    // 7. Continua o processamento para montar entry, containers e alerta
    for (let product of products) {
      // Encontra o estoque específico do galpão (stock_ID = 1)
      const galpaoStock = product.quantity_in_stock.find(
        (v) => v.stock_ID === 1,
      );
      const saldoAtualGalpao = galpaoStock ? galpaoStock.quantity : 0; // Garante que é 0 se não encontrado

      const galpaoEntries = await this.prisma.productsInContainer.findMany({
        where: { product_ID: product.ID, in_stock: true },
        ...(saldoAtualGalpao === 0 ? { take: 1 } : {}),
        orderBy: { ID: 'desc' },
      });

      let sum = 0;
      let realEntries: Array<{ ID: number, container_ID: number, updated_at: Date, created_at: Date }> = []

      if (saldoAtualGalpao === 0 && galpaoEntries.length === 1) {
        sum = galpaoEntries[0].quantity;
        realEntries.push(galpaoEntries[0]);
      } else {
        for (let entry of galpaoEntries) {
          sum += entry.quantity;
          realEntries.push(entry);
          if (sum > saldoAtualGalpao) break;
        }
      }
      const containerNames = await this.prisma.loteContainer.findMany({
        where: { ID: { in: realEntries.map(v => v.container_ID) } },
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
      product.entryDate = null

      // @ts-ignore
      product.daysInStock = 0
      if (realEntries.length > 0) {
        const lastEntry = realEntries[0]
        // @ts-ignore
        product.entryDate = new Date(lastEntry.updated_at)

        // @ts-ignore
        const timestamp = product.entryDate.valueOf();

        const now = Date.now();
        // @ts-ignore
        product.daysInStock = Math.floor((now - timestamp) / (1000 * 60 * 60 * 24));
      }
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

    // 1. Obter os IDs dos produtos transferidos para a loja (stock_ID = 2)
    const transferencesProductsIds = await this.prisma.transaction
      .findMany({
        where: {
          to_stock_ID: 2,
          type_ID: 3,
        },
        select: {
          product_ID: true,
        },
      })
      .then((transactions) => transactions.map((transaction) => transaction.product_ID));

    // 2. Definir o filtro de busca para os produtos da loja
    const whereClause: any = {
      is_active: true,
      ID: {
        in: transferencesProductsIds,
      },
      ...(importer && {
        importer: importer,
      }),
      ...(code && {
        code: {
          contains: code,
        },
      }),
      products_in_container: {
        some: {
          in_stock: true,
        },
      },
    };

    // 3. Construir a cláusula de ordenação dinamicamente
    const orderByClause: any = {};
    if (orderBy && orderType) {
      const prismaOrderByField = orderBy === 'codigo' ? 'code' : orderBy;
      orderByClause[prismaOrderByField] = orderType.toLowerCase();
    } else {
      orderByClause.code = 'asc';
    }

    // 4. Obter a contagem total de produtos que correspondem aos filtros para a loja
    const totalCount = await this.prisma.products.count({
      where: whereClause,
    });

    // 5. Obter os IDs de todos os produtos filtrados para somar o estoque total da loja (stock_ID = 2)
    const filteredProductIds = (
      await this.prisma.products.findMany({
        where: whereClause,
        select: { ID: true },
      })
    ).map((p) => p.ID);

    // 6. Obter a soma das quantidades de estoque para todos os produtos filtrados na loja (stock_ID = 2)
    const stockSums = await this.prisma.quantityInStock.groupBy({
      by: ['product_ID'],
      _sum: {
        quantity: true,
      },
      where: {
        product_ID: { in: filteredProductIds },
        stock_ID: 2, // Filtra apenas para a loja
      },
    });

    // 7. Criar um mapa das somas de estoque por product_ID
    const stockMap = new Map<number, number>();
    let totalQuantityInStock = 0;

    stockSums.forEach((item) => {
      const quantity = item._sum.quantity || 0;
      stockMap.set(item.product_ID, quantity);
      totalQuantityInStock += quantity; // Somando as quantidades totais
    });

    // 8. Ordenar os produtos pelo estoque da loja
    const sortedStock = stockSums.sort((a, b) => {
      const stockA = a._sum.quantity || 0;
      const stockB = b._sum.quantity || 0;

      // Ordenação crescente ou decrescente com base no orderType
      if (orderType === 'asc') {
        return stockA - stockB;
      } else {
        return stockB - stockA;
      }
    });

    // 9. Pegar os produtos com base na ordenação do estoque
    const ids = sortedStock.slice(limit * (page - 1), limit * page).map((item) => item.product_ID);

    // 10. Obter os produtos filtrados e paginados, agora ordenados pela quantidade em estoque
    const products = await this.prisma.products.findMany({
      where: {
        ID: {
          in: ids,
        },
      },
      orderBy: orderByClause, // Usa a cláusula de ordenação
      include: {
        quantity_in_stock: {
          orderBy: {
            ID: 'desc',
          },
        },
      },
    });

    // 11. Processar produtos para adicionar entradas, containers e alertas
    for (let product of products) {
      // Encontra o estoque específico da loja (stock_ID = 2)
      const lojaStock = product.quantity_in_stock.find((v) => v.stock_ID === 2);
      const saldoAtualLoja = lojaStock ? lojaStock.quantity : 0; // Garante que é 0 se não encontrado

      // Obter as transações de entrada de loja (do estoque 1 para o estoque 2)
      const lojaEntries = await this.prisma.transaction.findMany({
        where: {
          product_ID: product.ID,
          type_ID: 3, // Tipo de transação para a loja
          from_stock_ID: 1, // Estoque de origem
          to_stock_ID: 2, // Estoque de destino (loja)
        },
        ...(saldoAtualLoja === 0 ? { take: 1 } : {}),
        orderBy: { ID: 'desc' },
      });

      let sum = 0;
      let realEntries: Array<{ ID: number, updated_at: Date, created_at: Date }> = []

      // Calcular a quantidade de entradas na loja
      if (saldoAtualLoja === 0 && lojaEntries.length === 1) {
        sum = lojaEntries[0].quantity;
        realEntries.push(lojaEntries[0]);
      } else {
        for (let entry of lojaEntries) {
          sum += entry.quantity;
          realEntries.push(entry);
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
      product.entryDate = null

      // @ts-ignore
      product.daysInStock = 0
      if (realEntries.length > 0) {
        const lastEntry = realEntries[0]
        // @ts-ignore
        product.entryDate = new Date(lastEntry.updated_at)

        // @ts-ignore
        const timestamp = product.entryDate.valueOf();

        const now = Date.now();
        // @ts-ignore
        product.daysInStock = Math.floor((now - timestamp) / (1000 * 60 * 60 * 24));
      }
    }

    // 12. Retornar os produtos, a contagem total, e o estoque total da loja
    return {
      products: products,
      totalCount: totalCount,
      pageCount: Math.ceil(totalCount / limit),
      totalQuantityInStock: totalQuantityInStock, // Retorna o total de estoque da loja
    };
  }


  async getProductsNotSelled({
    page,
    limit,
    importer,
    code,
    orderBy,
    orderType,
  }: {
    code?: string;
    importer?: string;
  } & Pageable) {
    if (!page) page = 1;
    if (!limit) limit = 20;

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
    };

    const orderByClause: any = {};
    if (orderBy && orderType) {
      const prismaOrderByField = orderBy === 'codigo' ? 'code' : orderBy;
      orderByClause[prismaOrderByField] = orderType.toLowerCase();
    } else {
      orderByClause.ID = 'desc'; // Ordem padrão se não especificado
    }

    // 1. Buscar todos os produtos que correspondem aos filtros básicos.
    // Incluir dados relacionados necessários para o cálculo de "não vendido":
    // - quantity_in_stock para a quantidade atual no Galpão (stock_ID = 1)
    // - productsInContainer para obter a ÚLTIMA entrada do produto
    const allFilteredProducts = await this.prisma.products.findMany({
      where: whereClause,
      orderBy: orderByClause, // Aplicar ordenação aqui para que o `take: 1` seja consistente
      include: {
        quantity_in_stock: {
          where: { stock_ID: 1 },
          select: { quantity: true },
        },
        products_in_container: {
          // Alterado para productsInContainer (camelCase) conforme a definição do Prisma
          orderBy: { ID: 'desc' },
          take: 1,
          select: {
            quantity: true,
            ID: true,
            container_ID: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
    });

    const notSelledProducts = allFilteredProducts.filter((product) => {
      const currentGalpaoQuantity = product.quantity_in_stock.reduce(
        (sum, stock) => sum + stock.quantity,
        0,
      );

      const lastProductInContainerEntry = product.products_in_container[0]; // Obter a última entrada

      // Um produto é "não vendido" se ele tem uma última entrada E
      // a quantidade da última entrada é positiva E
      // sua quantidade atual no Galpão é IGUAL à quantidade da sua última entrada E
      // a quantidade atual no Galpão é POSITIVA.
      return (
        lastProductInContainerEntry &&
        lastProductInContainerEntry.quantity > 0 &&
        currentGalpaoQuantity === lastProductInContainerEntry.quantity && // Usando '===' para igualdade estrita
        currentGalpaoQuantity > 0
      );
    });

    // 3. Calcular totalCount e pageCount a partir da lista filtrada
    const totalCount = notSelledProducts.length;
    const pageCount = Math.ceil(totalCount / limit);

    // 4. Aplicar paginação à lista filtrada e ordenada (agora definida!)
    const startIndex = limit * (page - 1);
    const paginatedProducts = notSelledProducts.slice(
      startIndex,
      startIndex + limit,
    );

    // Calcular o totalQuantityInStock somando as quantidades dos produtos paginados
    const totalQuantityInStock = paginatedProducts.reduce((sum, product) => {
      const quantityInStock = product.quantity_in_stock.reduce(
        (subSum, stock) => subSum + stock.quantity,
        0,
      );
      return sum + quantityInStock;
    }, 0);

    // NOVO: Calcular o total de itens (produtos) armazenados no galpão sem considerar os filtros
    const totalProductsInGalpaoUnfiltered = await this.prisma.products.count({
      where: {
        is_active: true,
        quantity_in_stock: {
          some: {
            stock_ID: 1, // Apenas produtos no galpão
            // quantity: { gt: 0 }, // Com quantidade positiva
          },
        },
      },
    });

    return {
      products: paginatedProducts,
      totalCount: totalCount,
      pageCount: pageCount,
      totalQuantityInStock: totalQuantityInStock, // Agora calculado
      totalProductsInGalpaoUnfiltered: totalProductsInGalpaoUnfiltered, // NOVO: Total de produtos no galpão sem filtro
    };
  }

  async getProductSales(
    productID: number,
    startDate: string,
    endDate: string,
  ): Promise<{ 1: number; 2: number }> {
    if (typeof productID !== 'number' || productID <= 0) {
      console.error('Invalid product ID provided to getProductSales.');
      return { 1: 0, 2: 0 };
    }

    const product = await this.prisma.products.findUnique({
      where: {
        ID: productID,
      },
    });

    if (!product) return { 1: 0, 2: 0 };

    const startOfDay = new Date(startDate);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(endDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const sales = await this.prisma.transaction.findMany({
      where: {
        product_ID: product.ID,
        type_ID: 2,
        created_at: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },

      select: {
        quantity: true,
        from_stock_ID: true,
      },
    });

    return sales.reduce<{ 1: number; 2: number }>(
      (previous, current) => {
        if (current.from_stock_ID === 1 || current.from_stock_ID === 2) {
          previous[current.from_stock_ID] += current.quantity;
        }

        return previous;
      },
      { 1: 0, 2: 0 },
    );
  }
}
