import { Test, TestingModule } from '@nestjs/testing';
import { GiroService } from './giro.service';

describe('GiroService', () => {
  let service: GiroService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GiroService],
    }).compile();

    service = module.get<GiroService>(GiroService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
