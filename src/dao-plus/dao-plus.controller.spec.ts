import { Test, TestingModule } from '@nestjs/testing';
import { DaoPlusController } from './dao-plus.controller';

describe('DaoPlus Controller', () => {
  let controller: DaoPlusController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DaoPlusController],
    }).compile();

    controller = module.get<DaoPlusController>(DaoPlusController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
