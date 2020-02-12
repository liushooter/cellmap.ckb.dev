import { Injectable, Inject } from '@nestjs/common';
import { CELLS_REPOSITORY, SYNCSTAT_REPOSITORY, BLOCKS_REPOSITORY, DAO_TYPE_ID } from 'src/util/constant';
import { Cell } from 'src/cell/cell.entity';
import { SyncStat } from 'src/block/syncstat.entity';
import { Block } from 'src/cell/block.entity';
import { CkbService } from 'src/ckb/ckb.service';
import { JSBI } from '@nervosnetwork/ckb-sdk-utils';
     

@Injectable()
export class DaoService {
  constructor(
    @Inject(CELLS_REPOSITORY) private readonly cellModel: typeof Cell,
    @Inject(SYNCSTAT_REPOSITORY) private readonly statModel: typeof SyncStat,
    @Inject(BLOCKS_REPOSITORY) private readonly blockModel: typeof Block,
    private readonly ckbService: CkbService,
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
    const reverseString = (str: string) =>
      str
        .split('')
        .reverse()
        .join(''); 
    let daoHex = dao.replace('0x', '');

    const { BigInt } = JSBI;

    const accumulated_rate = BigInt('0x' + reverseString(daoHex.slice(0, 8)));
    const total_issued = BigInt('0x' + reverseString(daoHex.slice(16, 32)));
    const total_unissued = BigInt('0x' + reverseString(daoHex.slice(32, 48)));
    const occupied_capacity = BigInt('0x' + reverseString(daoHex.slice(48, 64)));

    // console.log('dao', { accumulated_rate, total_issued, total_unissued, occupied_capacity })

    return { accumulated_rate, total_issued, total_unissued, occupied_capacity }

  }

  async calculateDAOProfit(dao, depositBlock, withdrawBlock){

    let {depositBlockNumber, withdrawBlockNumber, size} = dao;


    const { divide, multiply, BigInt } = JSBI;
    const capacity = BigInt(size);

    console.log(depositBlock)
    console.log(withdrawBlock)

    const depositRate = this.parseDao(depositBlock.dao).accumulated_rate;
    const withdrawRate = this.parseDao(withdrawBlock.dao).accumulated_rate;

    let countedCapacity = divide(multiply(capacity, withdrawRate), depositRate).toString();

    let timeDuration = withdrawBlock.timestamp - depositBlock.timestamp;
    console.log('timeDruation is ', timeDuration);
    const rateBI = divide(divide(multiply(withdrawRate, BigInt(365*24*3600*10000)), depositRate), BigInt(timeDuration));
    const rate = Number(rateBI.toString())/10000;

    return {rate, countedCapacity};

  }
}