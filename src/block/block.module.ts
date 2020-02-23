import { Module } from '@nestjs/common';
import { BlockService } from './block.service';
import { BlockController } from './block.controller';
import { CellModule } from 'src/cell/cell.module';
import { DatabaseModule } from '../database/database.module';
import { blocksProviders } from './blocks.providers';
import { LoggerModule } from 'src/logger/logger.module';

@Module({
  imports: [DatabaseModule, CellModule, LoggerModule],
  providers: [BlockService, ...blocksProviders],
  exports: [BlockService],
  controllers: [BlockController],
})
export class BlockModule {}
