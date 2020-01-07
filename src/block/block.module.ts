import { Module } from '@nestjs/common';
import { BlockService } from './block.service'
import { BlockController } from './block.controller';
import { Block } from './block.entity'
import { CellModule } from 'src/cell/cell.module';
import { DatabaseModule } from '../database/database.module';
import {blocksProviders} from './blocks.providers'


@Module({
  imports: [DatabaseModule, CellModule],
  providers: [BlockService, ...blocksProviders],
  exports: [BlockService],
  controllers: [BlockController]
})

export class BlockModule {}
