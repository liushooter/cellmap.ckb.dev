import { Injectable, Inject } from '@nestjs/common';
import { CELLS_REPOSITORY, SYNCSTAT_REPOSITORY, BLOCKS_REPOSITORY, DAO_TYPE_ID, GENESIS_BLOCK_TIMESTAMP, MILLISECONDS_IN_YEAR } from 'src/util/constant';
import { Cell } from 'src/cell/cell.entity';
import { SyncStat } from 'src/block/syncstat.entity';
import { Block } from 'src/cell/block.entity';
import { CkbService } from 'src/ckb/ckb.service';
import { JSBI } from '@nervosnetwork/ckb-sdk-utils';
import apc from 'src/util/apc'
import { LoggerService } from 'nest-logger';
     

@Injectable()
export class DaoService {
  constructor(
    @Inject(CELLS_REPOSITORY) private readonly cellModel: typeof Cell,
    @Inject(SYNCSTAT_REPOSITORY) private readonly statModel: typeof SyncStat,
    @Inject(BLOCKS_REPOSITORY) private readonly blockModel: typeof Block,
    private readonly ckbService: CkbService,
    private readonly logger: LoggerService
  ) {}

  private readonly ckb = this.ckbService.getCKB();

  async getDaoCells(lockHash) {

    const condition = {
        typeId: DAO_TYPE_ID,
        isLive: true,
    };
    if(lockHash){
      condition['lockId'] = lockHash;
    }

    let cells = await this.cellModel.findAll({
      where: condition,
      order: [['id', 'desc']],
    });

    let daoCells = [];
    for (let cell of cells) {
      let { hash, idx, size, lockId, blockNumber } = cell;
      let type = 'deposit';
      let depositBlockNumber = blockNumber;
      let withdrawBlockNumber = null;

      let depsoitCell = await this.cellModel.findOne({
        where: {
          hash,
          idx,
          lockId,
          typeId: DAO_TYPE_ID,
          direction: false,
        },
      });

      if (depsoitCell) {
        type = 'withdraw';
        let dCell = await this.cellModel.findByPk(depsoitCell.rId);
        depositBlockNumber = dCell.blockNumber;
        withdrawBlockNumber = blockNumber;
      }

      if (!withdrawBlockNumber) {
        let tip = await this.statModel.findOne({});
        withdrawBlockNumber = tip.tip;
      }
      this.logger.info(`depositBlockNumber = [${depositBlockNumber}], withdrawBlockNumber = [${withdrawBlockNumber}]`, DaoService.name)
      const withdrawBlock = await this.blockModel.findByPk(withdrawBlockNumber);
      const depositBlock = await this.blockModel.findByPk(depositBlockNumber);

      const { rate, countedCapacity } = await this.calculateDAOProfit(
        { depositBlockNumber, withdrawBlockNumber, size },
        depositBlock,
        withdrawBlock,
      );

      const depositBlockHeader = {
        hash: depositBlock.hash,
        number: depositBlock.number,
        timestamp: depositBlock.timestamp,
        epoch: {
          length: '0x' + Number(depositBlock.epochLength).toString(16),
          index: '0x' + Number(depositBlock.epochIndex).toString(16),
          number: '0x' + Number(depositBlock.epochNumber).toString(16),
        },
      };

      const withdrawBlockHeader =
        type == 'withdraw'
          ? {
              hash: withdrawBlock.hash,
              number: withdrawBlock.number,
              timestamp: withdrawBlock.timestamp,
              epoch: {
                length: '0x' + Number(withdrawBlock.epochLength).toString(16),
                index: '0x' + Number(withdrawBlock.epochIndex).toString(16),
                number: '0x' + Number(withdrawBlock.epochNumber).toString(16),
              },
            }
          : null;
      daoCells.push({
        hash,
        idx,
        size,
        depositBlockHeader,
        withdrawBlockHeader,
        type,
        rate,
        countedCapacity,
      });
    }

    return daoCells;
  }


  parseDao(dao){
    const { BigInt } = JSBI;
    
    const fromHexInLittleEndian = (str) =>{

        return '0x'+str.match(/../g).reverse().join('');

    }
    
    let daoHex = dao.replace('0x', '');

    const total_issued = BigInt(fromHexInLittleEndian(daoHex.slice(0, 16)));
    const accumulated_rate = BigInt(fromHexInLittleEndian(daoHex.slice(16, 32)));
    const total_unissued = BigInt(fromHexInLittleEndian(daoHex.slice(32, 48)));
    const occupied_capacity = BigInt(fromHexInLittleEndian(daoHex.slice(48, 64)));

    return { accumulated_rate, total_issued, total_unissued, occupied_capacity }
    

  }


  async calculateDAOProfit(dao, depositBlock, withdrawBlock){

    let { size } = dao;
    const { add, divide, multiply, subtract, BigInt } = JSBI;

    const occupied_capacity = BigInt(102*10**8);
    const capacity = subtract(BigInt(size), occupied_capacity);

    const depositRate = this.parseDao(depositBlock.dao).accumulated_rate;
    const withdrawRate = this.parseDao(withdrawBlock.dao).accumulated_rate;

    let withdrawCountedCapacity = divide(multiply(capacity, withdrawRate), depositRate);

    const countedCapacity = add(withdrawCountedCapacity, occupied_capacity).toString();

    let timeDuration = withdrawBlock.timestamp - depositBlock.timestamp;

    this.logger.info(`depositRate = [${depositRate.toString(10)}], withdrawRate = [${withdrawRate.toString(10)}]`, DaoService.name);
    this.logger.info(`timeDruation = [${timeDuration}]`, DaoService.name);

    const startYearNumber = (+depositBlock.timestamp - +(GENESIS_BLOCK_TIMESTAMP || 0)) / MILLISECONDS_IN_YEAR
    const endYearNumber = (+withdrawBlock.timestamp - +(GENESIS_BLOCK_TIMESTAMP || 0)) / MILLISECONDS_IN_YEAR

    const rate = apc({startYearNumber, endYearNumber});

    return {rate, countedCapacity};


  }
}