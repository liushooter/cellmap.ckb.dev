import { Module, Logger, Injectable } from '@nestjs/common';
import { ScheduleModule } from 'nest-schedule';
import { BlockModule } from './block/block.module';
import { CellModule } from './cell/cell.module';
import { CkbModule } from './ckb/ckb.module';
import { DaoModule } from './dao/dao.module';
import { ConfigModule } from './config/config.module';
import { LoggerModule } from './logger/logger.module';
import { ExchangeModule } from './exchange/exchange.module';
import { RedisModule } from 'nestjs-redis';

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    ScheduleModule.register(),
    BlockModule,
    CellModule,
    CkbModule,
    DaoModule,
    ExchangeModule,
    RedisModule.register({ url: 'redis://:127.0.0.1:6379/1' }),
  ],
})
export class AppModule {}
