import { GiroService } from './giro.service';
export declare class GiroController {
    private giroService;
    constructor(giroService: GiroService);
    updateGiro(): "Atualizando giro!" | "Não é possível atualizar no momento";
}
