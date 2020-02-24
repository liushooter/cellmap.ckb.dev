import { Injectable, Inject } from '@nestjs/common';
import { NestSchedule, Interval } from 'nest-schedule';
import { EthTransfer } from './ethtransfer.entity';
import { ETHTRANSFER_REPOSITORY } from '../util/constant';
import { LoggerService } from 'nest-logger';

@Injectable()
export class ExchangeService extends NestSchedule {
  constructor(
    @Inject(ETHTRANSFER_REPOSITORY)
    private readonly ethTransferModel: typeof EthTransfer,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  @Interval(5 * 1000)
  async syncEthTransfers() {
    //TODO: fetch transfer data from etherscan.io
  }

  async getUserTransfers(ethAddress: string): Promise<EthTransfer[]> {
    // check address format

    // fetch transfer from table order by id desc
    const transfers = await this.ethTransferModel.findAll({
      where: { from: ethAddress },
      order: [['id', 'desc']],
    });

    return transfers;
    // return null;
  }
}
