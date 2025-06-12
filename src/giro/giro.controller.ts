import { Controller, Get } from '@nestjs/common';
import { GiroService } from './giro.service';

@Controller('giro')
export class GiroController {
  constructor(private giroService: GiroService) {}

  @Get('/update')
  updateGiro() {
    if (this.giroService.canUpdate()) {
      this.giroService.atualizarAgoraManual();
      return 'Atualizando giro!';
    } else {
      return 'Não é possível atualizar no momento';
    }
  }
}
