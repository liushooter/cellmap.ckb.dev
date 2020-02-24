import { Controller, Get, Param, Query, Injectable } from '@nestjs/common';
import { CellService } from './cell.service';
import {
  EMPTY_HASH,
  GENESIS_BLOCK_TIMESTAMP,
  MILLISECONDS_IN_YEAR,
} from 'src/util/constant';
import { ConfigService } from '../config/config.service';
import apc from 'src/util/apc';

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
    const formatedCells = cells.map(cell => this.formatCell(cell));
    return formatedCells;
  }

  @Get('txList')
  async getTxList(
    @Query('lockHash') lockHash,
    @Query('lastHash') lastHash,
    @Query('size') size,
    @Query('type') type,
  ) {
    size = size > 0 ? Number(size) : 20;
    const cells = await this.cellService.loadTxByConditions(
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

  @Get('loadMultiSigCell')
  async getMultiSigCell() {
    return this.cellService.loadMultiSigCell();
  }

  @Get('getConfig')
  async getConfig() {
    const keccakCodeHash = this.config.ETH_LOCK_TYPE_ID;
    const keccakTxHash = this.config.ETH_LOCK_TX_HASH;
    const cellDeps = await this.cellService.getEthDeps(keccakCodeHash);

    const startYearNumber =
      (+new Date().getTime() - +(GENESIS_BLOCK_TIMESTAMP || 0)) /
      MILLISECONDS_IN_YEAR;
    const endYearNumber = startYearNumber + 1;

    const rate = apc({ startYearNumber, endYearNumber });

    return {
      keccak_code_hash: keccakCodeHash,
      keccak_tx_hash: keccakTxHash,
      cellDeps,
      apc: rate,
    };
  }

  @Get('getCapacityByLockHash')
  async getCapacityByLockHash(@Query('lockHash') lockHash) {
    return await this.cellService.getCapacityByLockHash(lockHash);
  }

  formatCell(cell) {
    const blockHash = '';

    const {
      hash,
      idx,
      lockCode,
      dataLen,
      lockType,
      lockArgs,
      cellbase,
      id,
      typeId,
      typeCode,
      typeType,
      typeArgs,
      size,
    } = cell;
    const lock = { codeHash: lockCode, hashType: lockType, args: lockArgs };
    const outPoint = { txHash: hash, index: '0x' + idx.toString(16) };
    const outputDataLen = '0x' + dataLen.toString(16);

    const type =
      typeId === ''
        ? null
        : { codeHash: typeCode, hashType: typeType, args: typeArgs };
    const dataHash = EMPTY_HASH;

    const status = 'live';
    return {
      id,
      blockHash,
      lock,
      outPoint,
      outputDataLen,
      capacity: size,
      cellbase,
      type,
      dataHash,
      status,
    };
  }
}
