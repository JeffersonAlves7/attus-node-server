import { Controller, Get, Param, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('products')
  products(
    @Query('page', {
      transform(value) {
        if (!value) return 1;
        return Number(value);
      },
    })
    page: number,

    @Query('limit', {
      transform(value) {
        if (!value) return 20;
        return Math.min(Number(value), 100);
      },
    })
    limit: number,

    @Query('alerta', {
      transform(value) {
        if (!value) return 20;
        return Number(value);
      },
    })
    alerta: number,

    @Query('importer') importer?: string,
    @Query('code') code?: string,

    @Query('giroMin', {
      transform(value) {
        if (!value) return undefined;
        return Number(value);
      },
    })
    giroMin?: number,

    @Query('giroMax', {
      transform(value) {
        if (!value) return undefined;
        return Number(value);
      },
    })
    giroMax?: number,
  ) {
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

  @Get('products/notselled')
  productsNotSelled(
    @Query('page', {
      transform(value) {
        if (!value) return 1;
        return Number(value);
      },
    })
    page: number,

    @Query('limit', {
      transform(value) {
        if (!value) return 20;
        return Math.min(Number(value), 100);
      },
    })
    limit: number,
    @Query('importer') importer?: string,
    @Query('code') code?: string,
  ) {
    return this.appService.getProductsNotSelled({
      page,
      limit,
      code,
      importer,
    });
  }

  @Get('products/:stock')
  productsByStock(
    @Param('stock', {
      transform(value, metadata) {
        return value.toLowerCase();
      },
    })
    stock: string,

    @Query('page', {
      transform(value) {
        if (!value) return 1;
        return Number(value);
      },
    })
    page: number,

    @Query('limit', {
      transform(value) {
        if (!value) return 20;
        return Math.min(Number(value), 100);
      },
    })
    limit: number,

    @Query('alerta', {
      transform(value) {
        if (!value) return 20;
        return Number(value);
      },
    })
    alerta: number,

    @Query('importer') importer?: string,
    @Query('code') code?: string,
  ) {
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

  @Get('product/:id/sales')
  productSales(
    @Param('id')
    id: string,

    @Query('startDate', {
      transform(value) {
        if (value) return value;
        // Retorna a data atual no formato YYYY-MM-DD
        const date = new Date();
        return date.toISOString().split('T')[0];
      },
    })
    startDate: string,

    @Query('endDate', {
      transform(value) {
        if (value) return value;
        // Retorna a data de amanhã no formato YYYY-MM-DD
        const date = new Date();
        date.setDate(date.getDate() + 1); // Adiciona 1 dia
        return date.toISOString().split('T')[0];
      },
    })
    endDate: string,
  ) {
    return this.appService.getProductSales(
      Number.parseInt(id),
      startDate,
      endDate,
    );
  }
}
