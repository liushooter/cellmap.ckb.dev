import { Module } from '@nestjs/common';
import { ScheduleModule } from 'nest-schedule'
import { BlockModule } from './block/block.module';
import { CellModule } from './cell/cell.module';
import { CkbModule } from './ckb/ckb.module';
import { DaoModule } from './dao/dao.module';
import { ConfigModule } from './config/config.module';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.register(),
    BlockModule,
    CellModule,
    CkbModule,
    DaoModule,
  ],
})
export class AppModule {}
