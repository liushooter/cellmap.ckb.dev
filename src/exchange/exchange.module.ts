import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { LoggerModule } from 'src/logger/logger.module';
import { ExchangeController } from './exchange.controller';
import { ExchangeService } from './exchange.service';
import { ethTransferProviders } from './ethtransfer.providers';
import { ConfigModule } from 'src/config/config.module';
import { CkbModule } from 'src/ckb/ckb.module';

@Module({
  imports: [DatabaseModule, LoggerModule, ConfigModule, CkbModule],
  controllers: [ExchangeController],
  providers: [ExchangeService, ...ethTransferProviders],
  exports: [ExchangeService],
})
export class ExchangeModule {}
