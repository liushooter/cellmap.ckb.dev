import { Module } from '@nestjs/common';
import { DaoController } from './dao.controller';
import { DaoService } from './dao.service';
import { cellsProviders } from '../cell/cells.providers';
import { DatabaseModule } from '../database/database.module';
import { blocksProviders } from '../block/blocks.providers';

@Module({
  imports: [DatabaseModule],
  controllers: [DaoController],
  providers: [DaoService, ...cellsProviders, ...blocksProviders],
})
export class DaoModule {}
