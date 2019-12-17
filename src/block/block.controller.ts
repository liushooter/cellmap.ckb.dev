import { Controller, Get, Param } from '@nestjs/common';
import { BlockService } from './block.service';
import { Block } from './interfaces/block.interface';

@Controller('block')
export class BlockController {
  constructor(private readonly blockService: BlockService){}

  @Get('tip')

  async getTipBlockHeader(): Promise<Block> {
    const header = await this.blockService.getTipBlockHeader() 
    return await this.blockService.update(header)
  }

  @Get(':height')
  async getBlockByNumber(@Param('height') height): Promise<CKBComponents.Block> {
    return await this.blockService.getBlockByNumber(parseInt(height))
  }
}
