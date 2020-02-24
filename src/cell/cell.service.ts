import { Injectable, Inject } from '@nestjs/common';
import { CkbService } from '../ckb/ckb.service';
import { Cell } from './cell.entity';
import { AddressPrefix } from '@nervosnetwork/ckb-sdk-utils';
import { Op, fn, col } from 'sequelize';
import { Block } from './block.entity';
import { CELLS_REPOSITORY, EMPTY_HASH, DAO_TYPE_ID } from '../util/constant';
import { getCellAddress, uniqArray } from '../util/helper';
import { ConfigService } from '../config/config.service';
import { LoggerService } from 'nest-logger';

@Injectable()
export class CellService {
  constructor(
    @Inject(CELLS_REPOSITORY)
    private readonly cellModel: typeof Cell,
    private readonly ckbService: CkbService,
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  private readonly ckb = this.ckbService.getCKB();

  /**
   * fetch the specified block from CKB chain, extract data and then update database
   * @param height block number
   */
  async extractFromBlock(height: number) {
    const block = await this.ckb.rpc.getBlockByNumber(
      '0x' + height.toString(16),
    );

    await this.saveBlockHeader(block.header, block.transactions.length);

    for (let i = 0; i < block.transactions.length; i++) {
      const tx = block.transactions[i];
      const timestamp = block.header.timestamp;

      const cellbase = tx.inputs[0].previousOutput.txHash === EMPTY_HASH;
      let inputs = [];

      // update the spent outputs
      if (!cellbase) {
        inputs = tx.inputs.map(async (input, index) =>
          this.kill(height, i, cellbase, tx.hash, index, input, timestamp),
        );
      }

      // update the unspent outputs
      const outputs = tx.outputs.map(async (output, index) =>
        this.born(
          height,
          i,
          cellbase,
          tx.hash,
          index,
          output,
          tx.outputsData[index],
          timestamp,
        ),
      );
      await Promise.all([
        await Promise.all(inputs),
        await Promise.all(outputs),
      ]);
    }
  }

  /**
   * save block header info to database
   *
   * @param header Block header
   * @param txCount the transaction count in the block
   */
  async saveBlockHeader(header: CKBComponents.BlockHeader, txCount: number) {
    const block = new Block();
    const { number, epoch, hash, timestamp, dao } = header;
    const {
      number: epochNumber,
      index: epochIndex,
      length: epochLength,
    } = this.ckb.utils.parseEpoch(epoch);

    const blockInfo = {
      number: Number(number),
      epochNumber: Number(epochNumber),
      epochIndex: Number(epochIndex),
      epochLength: Number(epochLength),
      hash,
      timestamp: Number(timestamp),
      dao,
      transactionCount: txCount,
    };

    Object.assign(block, blockInfo);
    try {
      await block.save();
    } catch (err) {
      this.logger.error(
        `saveBlockHeader [${JSON.stringify(block)}] err`,
        err,
        'BLOCK_SYNC',
      );
    }
  }

  /**
   * update spent transaction output
   *
   * @param height block number
   * @param txIndex the transaction index in the block
   * @param cellbase if the transaction is cellbase transaction
   * @param hash transaction hash
   * @param index the input index of tx inputs
   * @param input the input data
   * @param time block timestamp
   */
  async kill(
    height: number,
    txIndex: number,
    cellbase: boolean,
    hash: CKBComponents.Hash,
    index: number,
    input: CKBComponents.CellInput,
    time,
  ) {
    const oldWhere = {
      hash: input.previousOutput.txHash,
      idx: Number(input.previousOutput.index).valueOf(),
      direction: true,
    };
    const oldCell = await this.cellModel.findOne({ where: oldWhere });

    if (oldCell) {
      const cell = new Cell();

      const {
        id,
        size,
        typeId,
        typeType,
        typeArgs,
        typeCode,
        lockId,
        lockArgs,
        lockCode,
        lockType,
        dataLen,
      } = oldCell;
      const newTime = Number(this.ckb.utils.JSBI.BigInt(time).toString());
      const blockNumber = height;
      const direction = false;
      const isLive = false;
      const idx = index;
      const cellInfo = {
        blockNumber,
        txIndex,
        hash,
        idx,
        direction,
        size,
        typeId,
        typeType,
        typeArgs,
        typeCode,
      };
      Object.assign(cellInfo, {
        lockId,
        lockArgs,
        lockCode,
        lockType,
        dataLen,
        isLive,
        cellbase,
        time: newTime,
        rId: id,
      });

      try {
        Object.assign(cell, cellInfo);
        await cell.save();

        Object.assign(oldCell, { isLive: false, rId: cell.id });
        await oldCell.save();
      } catch (err) {
        this.logger.error(
          `kill cell [${JSON.stringify(cell)}] err`,
          err,
          'BLOCK_SYNC',
        );
      }
    }
  }

  /**
   * save new unspent transaction output
   *
   * @param height block number
   * @param txIndex the transaction index of the block
   * @param cellbase if the transaction is cellbase
   * @param hash transaction hash
   * @param index the output index of the transaction
   * @param output the output
   * @param data the output data
   * @param time the timestamp of block
   */
  async born(
    height: number,
    txIndex: number,
    cellbase: boolean,
    hash: CKBComponents.Hash,
    index: number,
    output: CKBComponents.CellOutput,
    data: string,
    time: string,
  ) {
    const size = output.capacity;
    const type = output.type ? this.ckb.utils.scriptToHash(output.type) : '';
    const lock = { code: output.lock.codeHash, args: output.lock.args };

    const cell = new Cell();
    cell.blockNumber = height.valueOf();
    cell.txIndex = txIndex.valueOf();
    cell.hash = hash;
    cell.idx = index.valueOf();
    cell.direction = true;
    cell.size = Number(this.ckb.utils.JSBI.BigInt(size).toString());
    cell.typeId = type;
    cell.typeType = output.type?.hashType;
    cell.typeArgs = output.type?.args;
    cell.typeCode = output.type?.codeHash;

    cell.lockId = this.ckb.utils.scriptToHash(output.lock);
    cell.lockArgs = lock.args;
    cell.lockCode = lock.code;
    cell.lockType = output.lock.hashType;
    cell.dataLen = this.ckb.utils.hexToBytes(data).length;
    cell.isLive = true;
    cell.cellbase = cellbase;
    cell.time = Number(this.ckb.utils.JSBI.BigInt(time).toString());
    try {
      await cell.save();
    } catch (err) {
      this.logger.error(
        `born cell [${JSON.stringify(cell)}] err`,
        err,
        'BLOCK_SYNC',
      );
    }
  }

  /**
   * calculate count of live cells
   */
  async liveCount(): Promise<number> {
    return await this.cellModel.count({ where: { isLive: true } });
  }

  /**
   * pick live cells for transfer CKBytes
   *
   * @param lockHash lock script hash
   * @param totalCapacity the amount of transfer CKBytes
   * @param lastId the last id of last returned result
   */
  async pickLiveCellForTransfer(
    lockHash: string,
    totalCapacity: string,
    lastId: number,
  ): Promise<Cell[]> {
    const { add, BigInt, greaterThan, lessThan } = this.ckb.utils.JSBI;

    const condition = {
      lockId: lockHash,
      isLive: true,
      typeId: '',
      dataLen: 0,
      direction: 1,
    };

    let cellbase = false;
    if (lastId > 0) {
      const lastCell = await this.cellModel.findByPk(lastId);
      if (lastCell) {
        cellbase = lastCell.cellbase;
      }
      Object.assign(condition, { id: { [Op.gt]: lastId } });
      // condition['id'] = { [Op.gt]: lastId };
    }

    const costCapacity = add(BigInt(totalCapacity), BigInt(62 * 10 ** 8));
    let inputCapacity = BigInt(0);
    const selectedCells = [];
    let offset = 0;

    while (true) {
      const liveCells = await this.cellModel.findAll({
        where: { ...condition, cellbase },
        order: [['id', 'asc']],
        limit: 1000,
        offset,
      });

      for (const c of liveCells) {
        inputCapacity = add(inputCapacity, BigInt(c.size));
        selectedCells.push(c);
        if (greaterThan(inputCapacity, costCapacity)) {
          break;
        }
      }

      if (greaterThan(inputCapacity, costCapacity)) {
        break;
        // throw new Error(`Input capacity ${inputCapacity} is not enough for ${costCapacity}`);
      }
      if (liveCells.length < 1000) {
        if (cellbase) {
          break;
        } else {
          cellbase = true;
          offset = 0;
          if (Object.keys(condition).includes('id')) {
            const prop = 'id';
            delete condition[prop];
          }
          continue;
        }
      }
      offset += 1000;
    }

    return selectedCells;
  }

  /**
   * returns celldeps for CKB transaction
   * @param keccakTxHash
   */
  async getEthDeps(keccakTxHash) {
    const cell = await this.cellModel.findOne({
      where: { blockNumber: 0, txIndex: 0, idx: 1 },
    });

    const deps = [
      { depType: 'code', outPoint: { txHash: cell.hash, index: '0x3' } },
      { depType: 'code', outPoint: { txHash: keccakTxHash, index: '0x0' } },
    ];
    return deps;
  }

  /**
   * returns Secp256k1 Cell for CKB transaction
   */
  async loadSecp256k1Cell() {
    const cell1 = await this.cellModel.findOne({
      where: { blockNumber: 0, txIndex: 1 },
    });
    const cell2 = await this.cellModel.findOne({
      where: { blockNumber: 0, txIndex: 0, idx: 1 },
    });
    return {
      hashType: 'type',
      codeHash: cell2.typeId,
      outPoint: { txHash: cell1.hash, index: '0x0' },
    };
  }

  /**
   * returns MultiSignature Cell for CKB transaction
   */
  async loadMultiSigCell() {
    const cell1 = await this.cellModel.findOne({
      where: { blockNumber: 0, txIndex: 1 },
    });
    const cell2 = await this.cellModel.findOne({
      where: { blockNumber: 0, txIndex: 0, idx: 4 },
    });
    return {
      hashType: 'type',
      codeHash: cell2.typeId,
      outPoint: { txHash: cell1.hash, index: '0x1' },
    };
  }
  /**
   * returns Dao Cell for DAO transaction
   */
  async loadDaoCell() {
    const daoCodeHash = '';
    const cell = await this.cellModel.findOne({
      where: {
        blockNumber: 0,
        txIndex: 0,
        idx: 2,
      },
    });
    return {
      hashType: 'type',
      codeHash: daoCodeHash,
      typeHash: cell.typeId,
      outPoint: {
        txHash: cell.hash,
        index: '0x2',
      },
    };
  }

  /**
   * get cells by condition
   *
   * @param conditions
   * @param offset
   * @param limit
   * @param order
   */
  async loadCells(
    conditions,
    offset: number,
    limit: number,
    order?,
  ): Promise<Cell[]> {
    const cells = await this.cellModel.findAll({
      where: conditions,
      offset,
      limit,
      order,
    });
    return cells;
  }

  /**
   * returns tx list by lockscript hash, direction and limit
   *
   * @param lockHash lock script hash
   * @param direction for the lockHash, if the tx is add or sub CKBytes
   * @param limit
   * @param lastHash
   */
  async loadTxByConditions(
    lockHash: string,
    direction: string,
    limit: number,
    lastHash: string,
  ) {
    // build conditions for database query
    const conditions = {
      lockId: lockHash,
    };

    const fullTxs = [];
    let lastId = 999999999999;
    if (!lastHash) {
      this.logger.info('lastHash is empty', CellService.name);
    } else {
      lastId = await this.cellModel.min('id', {
        where: { lockId: lockHash, hash: lastHash },
      });
    }

    if (direction === 'in') {
      Object.assign(conditions, { direction: 1 });
    } else if (direction === 'out') {
      Object.assign(conditions, { direction: 0 });
    }

    // fetch tx list meet the conditions from db, if returned size < 5, repeat the steps to fetch again until the total size >= limit.
    while (true) {
      if (lastId < 999999999999) {
        Object.assign(conditions, { id: { [Op.lt]: lastId } });
      }

      this.logger.info(
        `condition is ${JSON.stringify(conditions)}`,
        CellService.name,
      );

      const results = await this.cellModel.findAll({
        attributes: [[fn('DISTINCT', col('hash')), 'hash'], 'blockNumber'],
        where: conditions,
        order: [['blockNumber', 'desc']],
        limit,
      });

      let txhashList = results.map(x => {
        const item = x.get({ plain: true });
        const key = 'hash';
        return item[key];
      });

      if (txhashList.length === 0) {
        break;
      }

      txhashList = uniqArray(txhashList);

      this.logger.info(
        `txHashList ${JSON.stringify(txhashList)}`,
        CellService.name,
      );

      const allOutputCells = await this.cellModel.findAll({
        where: { hash: { [Op.in]: txhashList }, direction: true },
        order: [['id', 'desc']],
      });

      const allInputCells = await this.cellModel.findAll({
        where: { hash: { [Op.in]: txhashList }, direction: false },
        order: [['id', 'desc']],
      });

      for (const hash of txhashList) {
        const tx = this.buildTx(allInputCells, allOutputCells, hash, lockHash);

        if (
          (direction === 'in' && tx.direction === 'in') ||
          (direction === 'out' && tx.direction === 'out') ||
          (direction !== 'in' && direction !== 'out')
        ) {
          fullTxs.push(tx);
        }
      }

      if (fullTxs.length >= 5 || fullTxs.length >= limit) {
        break;
      }

      let lastInputId = 9999999;
      if (allInputCells.length > 0) {
        lastInputId = allInputCells[allInputCells.length - 1].id;
      }
      let lastOutputId = 9999999;
      if (allOutputCells.length > 0) {
        lastOutputId = allOutputCells[allOutputCells.length - 1].id;
      }

      lastId = lastInputId < lastOutputId ? lastInputId : lastOutputId;
    }

    return fullTxs;
  }

  /**
   * calculate transaction type by input cells and output cells
   * if transaction is dao related, return dao-deposit/dao-withdraw1/dao-withdraw2
   *
   * @param inputCells input cell
   * @param outputCells output cell
   */
  getTxType(inputCells, outputCells) {
    let inputType = null;
    let inputAmount = 0;
    inputCells.forEach(cell => {
      if (cell.typeId === DAO_TYPE_ID) {
        inputType = 'dao';
        inputAmount = cell.size;
      }
    });
    let outputType = null;
    let outputAmount = 0;
    outputCells.forEach(cell => {
      if (cell.typeId === DAO_TYPE_ID) {
        outputType = 'dao';
        outputAmount = cell.size;
      }
    });

    let type = null;
    let daoAmount = 0;
    if (inputType === 'dao' && outputType === 'dao') {
      type = 'dao-withdraw1';
      daoAmount = inputAmount;
    }

    if (inputType === 'dao' && outputType === null) {
      type = 'dao-withdraw2';
      daoAmount = inputAmount;
    }

    if (inputType === null && outputType === 'dao') {
      type = 'dao-deposit';
      daoAmount = outputAmount;
    }
    return { type, daoAmount };
  }

  /**
   * Build a CKB transaction from input cells, output cells and lockscript hash
   *
   * @param allInputCells input cells of transaction
   * @param allOutputCells output cells of transaction
   * @param hash transaction hash
   * @param lockHash lockscript hash
   */
  buildTx(allInputCells, allOutputCells, hash, lockHash) {
    this.logger.info(`start build tx: ${hash} `);

    const { BigInt, add, subtract, greaterThan } = this.ckb.utils.JSBI;
    const txInputCells = allInputCells
      .filter(x => x.hash === hash)
      .sort((a, b) => a.idx - b.idx);

    const txOutputCells = allOutputCells
      .filter(x => x.hash === hash)
      .sort((a, b) => a.idx - b.idx);

    this.logger.info(
      `txInputCells.length = [${txInputCells.length}], txOutputCells.length = [${txOutputCells.length}]`,
    );

    const { type, daoAmount } = this.getTxType(txInputCells, txOutputCells);
    const time = txOutputCells[0].time;
    const userInputCells = txInputCells.filter(c => c.lockId === lockHash);
    const userOutputCells = txOutputCells.filter(c => c.lockId === lockHash);

    const inAmount =
      userInputCells.length > 0
        ? userInputCells.map(c => BigInt(c.size)).reduce(add)
        : BigInt(0);
    const outAmount =
      userOutputCells.length > 0
        ? userOutputCells.map(c => BigInt(c.size)).reduce(add)
        : BigInt(0);

    let direction;
    let amount;
    const inputSize = txInputCells.length;
    const outputSize = txOutputCells.length;

    const prefix =
      this.ckbService.getChain() === 'ckb'
        ? AddressPrefix.Mainnet
        : AddressPrefix.Testnet;

    const from =
      txInputCells.length > 0
        ? getCellAddress(txInputCells[0], prefix, this.config.ETH_LOCK_TYPE_ID)
        : 'cellbase';
    const to = getCellAddress(
      txOutputCells[0],
      prefix,
      this.config.ETH_LOCK_TYPE_ID,
    );

    const blockNumber = txOutputCells[0].blockNumber;

    if (greaterThan(outAmount, inAmount)) {
      direction = 'in';
      amount = '0x' + subtract(outAmount, inAmount).toString(16);
    } else {
      direction = 'out';
      amount = '0x' + subtract(inAmount, outAmount).toString(16);
    }

    if (type === 'dao-withdraw2') {
      amount = '0x' + outAmount.toString(16);
    }
    if (type === 'dao-deposit' || type === 'dao-withdraw1') {
      amount = '0x' + BigInt(daoAmount).toString(16);
    }

    this.logger.info(`TX [${hash}] ${from} -> ${to} : ${amount}`);

    const result = {
      hash,
      time,
      from,
      to,
      type,
      amount,
      direction,
      blockNumber,
      inputSize,
      outputSize,
    };
    this.logger.info(`finish buildTx: [${JSON.stringify(result)}]`);
    return result;
  }

  /**
   * return total capacity according to the lock script hash
   * @param lockHash lock script hash
   */
  async getCapacityByLockHash(lockHash) {
    const capacity = await this.cellModel.sum('size', {
      where: { lockId: lockHash, typeId: '', isLive: true, direction: true },
    });
    return '0x' + capacity.toString(16);
  }
}
