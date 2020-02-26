import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { LoggerModule } from 'src/logger/logger.module';
import { ExchangeController } from './exchange.controller';
import { ExchangeService } from './exchange.service';
import { ethTransferProviders } from './ethtransfer.providers';
import { ConfigModule } from 'src/config/config.module';
import { CkbModule } from 'src/ckb/ckb.module';
import { RedisModule } from 'nestjs-redis';
import { CellModule } from 'src/cell/cell.module';

@Module({
  imports: [
    DatabaseModule,
    LoggerModule,
    ConfigModule,
    CkbModule,
    RedisModule,
    CellModule,
  ],
  controllers: [ExchangeController],
  providers: [ExchangeService, ...ethTransferProviders],
  exports: [ExchangeService],
})
export class ExchangeModule {}
