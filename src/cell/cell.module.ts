import { Module } from '@nestjs/common';
import { CellController } from './cell.controller';
import { CellService } from './cell.service';
import { CkbModule } from 'src/ckb/ckb.module';
import { Cell } from './cell.entity';
import {DatabaseModule} from '../database/database.module'
import {cellsProviders} from './cells.providers'

@Module({
  imports: [
    DatabaseModule, CkbModule
  ],
  controllers: [CellController],
  providers: [CellService, ...cellsProviders],
  exports: [CellService]
})
export class CellModule {}
