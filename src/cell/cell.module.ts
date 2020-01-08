import { Module } from '@nestjs/common';
import { CellController } from './cell.controller';
import { CellService } from './cell.service';
import { CkbModule } from 'src/ckb/ckb.module';
import {DatabaseModule} from '../database/database.module'
import {cellsProviders} from './cells.providers'
import {blocksProviders} from '../block/blocks.providers'

@Module({
  imports: [
    DatabaseModule, CkbModule
  ],
  controllers: [CellController],
  providers: [CellService, ...cellsProviders, ...blocksProviders],
  exports: [CellService]
})
export class CellModule {}
