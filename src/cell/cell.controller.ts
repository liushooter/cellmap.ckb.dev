import { Controller, Get, Param, Query } from '@nestjs/common';
import { CellService } from './cell.service';
import { CLIENT_RENEG_LIMIT } from 'tls';
import { type } from 'os';

@Controller('cell')
export class CellController {
  constructor(private readonly cellService: CellService) {}

  @Get('live')
  async countLive() {
    const count = await this.cellService.liveCount();
    return count;
  }

  @Get('unSpent')
  async getUnspentCell(
    @Query('lockHash') lockHash,
    @Query('capacity') capacity,
  ) {
    if (!capacity) {
      throw new Error('param capacity is invalid');
    }
    // console.log(lockHash, capacity);

    const cells = await this.cellService.pickLiveCellForTransfer(
      lockHash,
      capacity,
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
      const cellbase = true;
      const type =
        cell.typeId === ''
          ? null
          : {
              codeHash: cell.typeCode,
              hashType: cell.typeType,
              args: cell.typeArgs,
            };

      const dataHash =
        '0x0000000000000000000000000000000000000000000000000000000000000000';
      const status = 'live';
      return {
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
    @Query('lastBlock') lastBlock,
    @Query('size') size,
    @Query('type') type,
  ) {
    size = size > 0 ? parseInt(size) : 20;
    lastBlock = lastBlock > 0 ? lastBlock : 999999999;
    let cells = await this.cellService.loadTxByConditions(
      lockHash,
      type,
      size,
      lastBlock,
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
    let keccak_code_hash =
      '0x966e7bf34d4f6dc7ea18c0f86fe9ced504fad7565b47f8c3e168d2e48b1e2970';
    let keccak_tx_hash =
      '0xee768786e221da161b25bf60c1f1eb5457d61acb1c6457e602d900b02ad61733';
    let cellDeps = await this.cellService.getEthDeps(keccak_tx_hash);
    return {
      keccak_code_hash,
      keccak_tx_hash,
      cellDeps,
    };
  }

  @Get('daoList')
  async getDaoList(@Query('lockHash') lockHash, @Query('type') type) {
      
    return await this.cellService.getDaoCells(lockHash);
  }

  @Get('getCapacityByLockHash')
  async getCapacityByLockHash(@Query('lockHash') lockHash){
      return await this.cellService.getCapacityByLockHash(lockHash);
  }
}
