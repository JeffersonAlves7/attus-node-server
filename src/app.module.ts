import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { GiroService } from './giro/giro.service';
import { ScheduleModule } from '@nestjs/schedule';
import { GiroController } from './giro/giro.controller';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [AppController, GiroController],
  providers: [AppService, PrismaService, GiroService],
})
export class AppModule {}
