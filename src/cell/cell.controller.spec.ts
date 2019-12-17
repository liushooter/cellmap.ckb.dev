import { Test, TestingModule } from '@nestjs/testing';
import { CellController } from './cell.controller';

describe('Cell Controller', () => {
  let controller: CellController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CellController],
    }).compile();

    controller = module.get<CellController>(CellController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
