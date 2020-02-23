import { Controller, Get, Param } from '@nestjs/common';
import { BlockService } from './block.service';
import { SyncStat } from './syncstat.entity';

@Controller('block')
export class BlockController {
  constructor(private readonly blockService: BlockService) {}

  @Get('tip')
  async getTipBlockHeader(): Promise<SyncStat> {
    // const header = await this.blockService.getTipBlockHeader()
    return await this.blockService.getLastestBlock();
  }

  @Get('feeRate')
  async getFeeRate(): Promise<CKBComponents.FeeRate> {
    return await this.blockService.getFeeRate();
  }

  @Get(':height')
  async getBlockByNumber(
    @Param('height') height,
  ): Promise<CKBComponents.Block> {
    return await this.blockService.getBlockByNumber(Number(height));
  }
}
