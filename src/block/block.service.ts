import { Inject, Injectable } from '@nestjs/common';
import { Interval, NestSchedule } from 'nest-schedule';
import { CkbService } from '../ckb/ckb.service';
import { CellService } from 'src/cell/cell.service';
import { SyncStat } from './syncstat.entity';
import { SYNCSTAT_REPOSITORY } from '../util/constant';
import { LoggerService } from 'nest-logger';

@Injectable()
export class BlockService extends NestSchedule {
  constructor(
    @Inject(SYNCSTAT_REPOSITORY)
    private readonly syncStatModel: typeof SyncStat,
    private readonly ckbService: CkbService,
    private readonly cellService: CellService,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  private readonly ckb = this.ckbService.getCKB();

  private syncing = false;
  private syncingBlock = 0;

  /**
   * sync ckb chain data from ckb node. start a new sync every 5 seconds.
   */
  @Interval(5 * 1000)
  async sync() {
    // if it is syncing data right now, skip starting new sync
    if (this.syncing) {
      this.logger.info(
        `Sync Skipped, current is syncing [${this.syncingBlock}]`,
        'BLOCK_SYNC',
      );
      await this.updateTip(this.syncingBlock);
      return;
    }

    this.syncing = true;

    const header = await this.ckb.rpc.getTipHeader();
    const currentTip = parseInt(header.number, 16);
    const lastBlock = await this.syncStatModel.findAll();
    const lastTip = lastBlock.length > 0 ? lastBlock[0].tip : -1;

    if (this.syncingBlock < lastTip) {
      this.syncingBlock = lastTip;
    }

    // processing blocks from the last syncing block to the latest block of chain.
    for (let i = lastTip + 1; i <= currentTip; i++) {
      await this.cellService.extractFromBlock(i);
      this.syncingBlock = i;
      if (i === currentTip) {
        this.logger.info(
          `Synced block from [${lastTip + 1}] to [${currentTip}]`,
          'BLOCK_SYNC',
        );
      }
    }

    await this.updateTip(currentTip);
    this.syncing = false;
  }

  /**
   * update last syncing block
   * @param tip block number
   */
  async updateTip(tip: number): Promise<any> {
    const blocks = await this.syncStatModel.findAll();
    let block;
    if (blocks.length > 0) {
      block = blocks[0];
      block.tip = tip;
      await block.save();
    } else {
      block = new SyncStat();
      block.tip = tip;
      await block.save();
    }
    return { block };
  }

  /**
   * get the last syncing block info
   */
  async getLastestBlock(): Promise<SyncStat> {
    const blocks = await this.syncStatModel.findAll();
    return blocks.length > 0 ? blocks[0] : null;
  }

  /**
   * get the latest block header on CKB chain
   */
  async getTipBlockHeader(): Promise<CKBComponents.BlockHeader> {
    return await this.ckb.rpc.getTipHeader();
  }

  /**
   * get block info with block height
   * @param height block number
   *
   * @returns block info
   */
  async getBlockByNumber(height: number): Promise<CKBComponents.Block> {
    const hexHeight = '0x' + height.toString(16);
    return await this.ckb.rpc.getBlockByNumber(hexHeight);
  }

  /**
   * get the best transaction fee rate currently.
   */
  async getFeeRate(): Promise<CKBComponents.FeeRate> {
    let feeRate: CKBComponents.FeeRate = { feeRate: '1000' };
    try {
      feeRate = await this.ckb.rpc.estimateFeeRate('0x3');
    } catch (err) {
      this.logger.error('estimateFeeRate error', err, BlockService.name);
    }
    return feeRate;
  }
}
