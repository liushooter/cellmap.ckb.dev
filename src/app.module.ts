import { Module, Logger } from '@nestjs/common';
import { ScheduleModule } from 'nest-schedule';
import { BlockModule } from './block/block.module';
import { CellModule } from './cell/cell.module';
import { CkbModule } from './ckb/ckb.module';
import { DaoModule } from './dao/dao.module';
import { ConfigModule } from './config/config.module';
import { LoggerModule } from './logger/logger.module';
import { DaoPlusController } from './dao-plus/dao-plus.controller';
import { DaoPlusService } from './dao-plus/dao-plus.service';
import { DaoPlusModule } from './dao-plus/dao-plus.module';

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    ScheduleModule.register(),
    BlockModule,
    CellModule,
    CkbModule,
    DaoModule,
    DaoPlusModule,
  ],
})
export class AppModule {}
