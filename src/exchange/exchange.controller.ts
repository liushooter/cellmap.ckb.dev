import { Controller, Get, Query, Injectable } from '@nestjs/common';
import { ExchangeService } from './exchange.service';
import { EthTransfer } from './ethtransfer.entity';

@Injectable()
@Controller('exchange')
export class ExchangeController {
  constructor(private readonly exchangeService: ExchangeService) {}

  @Get('transactions')
  async getTransactionList(
    @Query('address') address: string,
  ): Promise<EthTransfer[]> {
    return await this.exchangeService.getUserTransfers(address);
  }
}
