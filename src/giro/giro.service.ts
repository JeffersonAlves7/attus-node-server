// src/giro.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class GiroService {
  private readonly logger = new Logger(GiroService.name);
  private readonly batchSize = 50;
  private updating = false;

  constructor(private prisma: PrismaService) {}

  canUpdate() {
    return !this.updating;
  }

  @Cron('*/10 * * * *') 
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
        const saldoAtual = produto.quantity_in_stock.reduce(
          (acc, item) => acc + item.quantity,
          0,
        );

        const entradas = await this.prisma.productsInContainer.findMany({
          where: { product_ID: produto.ID },
          orderBy: { ID: 'desc' },
        });

        let soma = 0;
        const ids: number[] = [];

        if (saldoAtual === 0 && entradas.length === 1) {
          soma = entradas[0].quantity;
          ids.push(entradas[0].container_ID);
        } else {
          for (const entrada of entradas) {
            soma += entrada.quantity;
            ids.push(entrada.container_ID);
            if (soma + entrada.quantity > saldoAtual) break;
          }
        }

        let giro = 0;

        if (soma > 0) {
          if (saldoAtual === 0) {
            giro = 100;
          } else if (saldoAtual === soma) {
            giro = 0;
          } else {
            const diff = soma - saldoAtual;
            giro = Number(((diff / soma) * 100).toFixed(2));
          }
        }

        await this.prisma.products.update({
          where: { ID: produto.ID },
          data: { giro_percentual: giro },
        });
      }

      this.logger.log(
        `Lote ${page + 1} processado (${produtos.length} produtos).`,
      );

      page++;
    }

    this.updating = false;
    this.logger.log('Atualização de giro finalizada.');
  }

  async atualizarAgoraManual() {
    return await this.atualizarGiroEmLotes();
  }
}
