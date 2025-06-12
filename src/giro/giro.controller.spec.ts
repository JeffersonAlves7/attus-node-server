import { Test, TestingModule } from '@nestjs/testing';
import { GiroController } from './giro.controller';

describe('GiroController', () => {
  let controller: GiroController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GiroController],
    }).compile();

    controller = module.get<GiroController>(GiroController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
