import { Module } from '@nestjs/common';
import { DaoPlusController } from './dao-plus.controller';
import { DaoPlusService } from './dao-plus.service';
import { LoggerModule } from 'src/logger/logger.module';
import { ConfigModule } from 'src/config/config.module';
import { DaoModule } from 'src/dao/dao.module';
import { DatabaseModule } from 'src/database/database.module';
import { cellsProviders } from 'src/cell/cells.providers';
import { blocksProviders } from '../block/blocks.providers';

@Module({
  imports: [LoggerModule, ConfigModule, DaoModule, DatabaseModule],
  controllers: [DaoPlusController],
  providers: [DaoPlusService, ...cellsProviders, ...blocksProviders],
})
export class DaoPlusModule {}
