import { Test, TestingModule } from '@nestjs/testing';
import { DaoPlusService } from './dao-plus.service';

describe('DaoPlusService', () => {
  let service: DaoPlusService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DaoPlusService],
    }).compile();

    service = module.get<DaoPlusService>(DaoPlusService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
