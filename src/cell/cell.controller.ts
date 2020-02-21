import { Controller, Get, Param, Query, Injectable } from '@nestjs/common';
import { CellService } from './cell.service';
import { EMPTY_HASH, GENESIS_BLOCK_TIMESTAMP, MILLISECONDS_IN_YEAR } from 'src/util/constant';
import { ConfigService } from '../config/config.service';

import apc from 'src/util/apc'

@Injectable()
@Controller('cell')
export class CellController {
  constructor(
    private readonly cellService: CellService,
    private readonly config: ConfigService,
  ) {}

  @Get('live')
  async countLive() {
    const count = await this.cellService.liveCount();
    return count;
  }

  @Get('unSpent')
  async getUnspentCell(
    @Query('lockHash') lockHash,
    @Query('capacity') capacity,
    @Query('lastId') lastId,
  ) {
    if (!capacity) {
      throw new Error('param capacity is invalid');
    }

    const cells = await this.cellService.pickLiveCellForTransfer(
      lockHash,
      capacity,
      lastId,
    );

    let formatedCells = cells.map(cell => {
      const blockHash = '';
      const lock = {
        codeHash: cell.lockCode,
        hashType: cell.lockType,
        args: cell.lockArgs,
      };
      const outPoint = {
        txHash: cell.hash,
        index: '0x' + cell.idx.toString(16),
      };
      const outputDataLen = '0x' + cell.dataLen.toString(16);

      const capacity = cell.size;
      const cellbase = cell.cellbase;
      const id = cell.id;
      const type =
        cell.typeId === ''
          ? null
          : {
              codeHash: cell.typeCode,
              hashType: cell.typeType,
              args: cell.typeArgs,
            };

      const dataHash = EMPTY_HASH;
        
      const status = 'live';
      return {
        id,
        blockHash,
        lock,
        outPoint,
        outputDataLen,
        capacity,
        cellbase,
        type,
        dataHash,
        status,
      };
    });
    return formatedCells;
  }

  @Get('txList')
  async getTxList(
    @Query('lockHash') lockHash,
    @Query('lastHash') lastHash,
    @Query('size') size,
    @Query('type') type,
  ) {
    size = size > 0 ? parseInt(size) : 20;
    let cells = await this.cellService.loadTxByConditions(
      lockHash,
      type,
      size,
      lastHash,
    );

    return cells;
  }

  @Get('loadDaoCell')
  async loadDaoCell() {
    return await this.cellService.loadDaoCell();
  }

  @Get('loadSecp256k1Cell')
  async getSecp256k1Cell() {
    return this.cellService.loadSecp256k1Cell();
  }

  @Get('getConfig')
  async getConfig() {
    let keccak_code_hash = this.config.ETH_LOCK_TYPE_ID;
    let keccak_tx_hash = this.config.ETH_LOCK_TX_HASH;
    let cellDeps = await this.cellService.getEthDeps(keccak_tx_hash);

    const startYearNumber = (+new Date().getTime() - +(GENESIS_BLOCK_TIMESTAMP || 0)) / MILLISECONDS_IN_YEAR
    const endYearNumber = startYearNumber + 1;

    const rate = apc({startYearNumber, endYearNumber});

    return {
      keccak_code_hash,
      keccak_tx_hash,
      cellDeps,
      apc: rate
    };
  }

  @Get('getCapacityByLockHash')
  async getCapacityByLockHash(@Query('lockHash') lockHash){
      return await this.cellService.getCapacityByLockHash(lockHash);
  }
}
