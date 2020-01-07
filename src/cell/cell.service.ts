import { Injectable, Inject } from '@nestjs/common';
import { CkbService } from '../ckb/ckb.service';
import { Cell } from './cell.entity';
import { AddressType, AddressPrefix } from '@nervosnetwork/ckb-sdk-utils';
import {Op, QueryTypes} from "sequelize";


@Injectable()
export class CellService {
  constructor(
    // @InjectRepository(Cell)
    // private readonly cellModel: Repository<Cell>,
    @Inject('CELLS_REPOSITORY')
    private readonly cellModel: typeof Cell,
    private readonly ckbService: CkbService,
  ) {}

  private readonly ckb = this.ckbService.getCKB();

  async extractFromBlock(height: Number) {
    // console.time("process block" + height)
    const block = await this.ckb.rpc.getBlockByNumber(
      '0x' + height.toString(16),
    );

    // console.timeLog("process block" + height)

    // console.log(`BLOCK ${height}`)

    for (let i = 0; i < block.transactions.length; i++) {
      const tx = block.transactions[i];
      const timestamp = block.header.timestamp;

      const inputs = tx.inputs.map(async (input, index) =>
        this.kill(height, input, tx.hash, index, timestamp),
      );

      // if(tx.inputs.length <= 0){
      // }
      const cellbase =
        tx.inputs[0].previousOutput.txHash ==
        '0x0000000000000000000000000000000000000000000000000000000000000000';

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
    // console.timeEnd("process block" + height)
  }

  async kill(
    height: Number,
    input: CKBComponents.CellInput,
    cHash: CKBComponents.Hash,
    cIndex: Number,
    cTime: string,
  ) {
    const {
      previousOutput: { index, txHash },
    } = input;
    const cid = `${txHash}+${index}`;

    const cell = await this.cellModel.findOne({
      where: {
        hash: txHash,
        idx: Number(index),
      },
    });
    if (cell) {
      cell.isLive = false;
      cell.cIdx = cIndex.valueOf();
      cell.cHash = cHash;
      cell.cBlockNumber = height.valueOf();
      cell.cTime = Number(this.ckb.utils.JSBI.BigInt(cTime).toString());
      await cell.save();
    }
  }

  async born(
    height: Number,
    txIndex: Number,
    cellbase: boolean,
    hash: CKBComponents.Hash,
    index: Number,
    output: CKBComponents.CellOutput,
    data: string,
    time: string,
  ) {
    const cid = `${hash}+0x${index.toString(16)}`;
    const size = output.capacity;
    const type = output.type ? this.ckb.utils.scriptToHash(output.type) : '';
    const lock = { code: output.lock.codeHash, args: output.lock.args };

    const cell = new Cell();
    cell.blockNumebr = height.valueOf();
    cell.txIndex = txIndex.valueOf();
    cell.hash = hash;
    cell.idx = index.valueOf();
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
      console.log('insert err', err);
    }
  }

  async liveCount(): Promise<Number> {
    return await this.cellModel.count({ where: { isLive: true } });
  }

  async pickLiveCellForTransfer(
    lockHash: string,
    totalCapacity: string,
  ): Promise<Cell[]> {
    const liveCells = await this.cellModel.findAll({
      where: { lockId: lockHash, isLive: true, typeId: '', dataLen: 0 },
    });

    const { add, BigInt, greaterThan, lessThan } = this.ckb.utils.JSBI;

    const costCapacity = BigInt(totalCapacity);

    let inputCapacity = BigInt(0);

    let selectedCells = [];

    for (let i = 0; i < liveCells.length; i++) {
      const c = liveCells[i];
      inputCapacity = add(inputCapacity, BigInt(c.size));

      selectedCells.push(c);
      if (greaterThan(inputCapacity, costCapacity)) {
        break;
      }
    }

    if (lessThan(inputCapacity, costCapacity)) {
      throw new Error('Input capacity is not enough');
    }

    return selectedCells;
  }

  async loadSecp256k1Cell() {
    const cell1 = await this.cellModel.findOne({
      where: { blockNumebr: 0, txIndex: 1 },
    });
    const cell2 = await this.cellModel.findOne({
      where: { blockNumebr: 0, txIndex: 0, idx: 1 },
    });
    return {
      hashType: 'type',
      codeHash: cell2.typeId,
      outPoint: {
        txHash: cell1.hash,
        index: '0x0',
      },
    };
  }

  async loadDaoCell() {
    const daoCodeHash = '';
    const cell = await this.cellModel.findOne({
      where: {
        blockNumebr: 0,
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

  async loadTxByConditions(
    lockHash: string,
    direction: string,
    limit: number,
    offset: number,
  ) {
    let selectPart = ' SELECT DISTINCT(`hash`), time FROM ';
    let inFromPart =
      " SELECT DISTINCT(`hash`), time FROM cells WHERE lockId = '" +
      lockHash +
      "'";
    let outFromPart =
      " SELECT DISTINCT(`cHash`) AS `hash`, ctime AS time FROM cells WHERE lockId = '" +
      lockHash +
      "' AND isLive = 0";
    let orderPart = ` ORDER BY time DESC LIMIT ${limit} OFFSET ${offset}`;

    let sql = '';
    if (direction == 'in') {
      sql = inFromPart + orderPart;
    } else if (direction == 'out') {
      sql = outFromPart + orderPart;
    } else {
      sql =
        selectPart +
        '((' +
        inFromPart +
        ') UNION (' +
        outFromPart +
        ')) as TX ' +
        orderPart;
    }

    console.log(sql);

    const results = await this.cellModel.sequelize.query(sql, { type: QueryTypes.SELECT});
    console.log('result', results.length);

    let fullTxs = [];
    
    let txhashList = results.map(x => x['hash']);
    console.log('txHashList',txhashList);

    // let {In} = this.cellModel

    const allInputCells = await this.cellModel.findAll({
      where: { cHash: {[Op.in]: txhashList}} },
    );
    const allOutputCells = await this.cellModel.findAll({
      where: { Hash: {[Op.in]: txhashList}} },
    );

    for (let tx of results) {

      let hash = tx['hash'];
      let time = tx['time'];
      // console.log('tx', tx, hash, time);
      let txInputCells = allInputCells
        .filter(x => x.cHash === hash)
        .sort((a, b) => a.idx - b.idx);

      let txOutputCells = allOutputCells
        .filter(x => x.hash === hash)
        .sort((a, b) => a.idx - b.idx);

      // console.log('input', txInputCells);
      // console.log('output', txOutputCells);

      let { BigInt, add, subtract, greaterThan } = this.ckb.utils.JSBI;

      let userInputCells = txInputCells.filter(c => c.lockId == lockHash);
      let userOutputCells = txOutputCells.filter(c => c.lockId == lockHash);

      const inAmount =
        userInputCells.length > 0
          ? userInputCells.map(c => BigInt(c.size)).reduce(add)
          : BigInt(0);
      const outAmount =
        userOutputCells.length > 0
          ? userOutputCells.map(c => BigInt(c.size)).reduce(add)
          : BigInt(0);

      // console.log(inputCells.filter((c)=>c.lockId == lockHash).map((c)=>BigInt(c.size)));
      // console.log(inAmount, outAmount);

      let direction, amount;
      let inputSize = txInputCells.length;
      let outputSize = txOutputCells.length;

      let from = txInputCells.length > 0 ?this.getCellAddress(txInputCells[0]): 'cellbase';
      let to = this.getCellAddress(txOutputCells[0]);

      if (greaterThan(outAmount, inAmount)) {
        direction = 'in';
        amount = '0x' + subtract(outAmount, inAmount).toString(16);
      } else {
        direction = 'out';
        amount = '0x' + subtract(inAmount, outAmount).toString(16);
      }

      console.log( from, '-------------', to, '-----', amount );

      fullTxs.push({ hash, time, from, to, amount, direction, inputSize, outputSize });
    }
    return fullTxs;
  }

  getCellAddress(cell) {
    let { lockArgs, lockType, lockCode } = cell;
    let type =
      lockType == 'type' ? AddressType.TypeCodeHash : AddressType.DataCodeHash;
    let prefix =
      this.ckbService.getChain() == 'ckb'
        ? AddressPrefix.Mainnet
        : AddressPrefix.Testnet;

    // short address
    if (
      lockCode ===
        '0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8' &&
      lockType == 'type'
    ) {
      return this.ckb.utils.bech32Address(lockArgs, {
        prefix,
        type: AddressType.HashIdx,
        codeHashOrCodeHashIndex: '0x00',
      });
    }

    return this.ckb.utils.fullPayloadToAddress({
      arg: lockArgs,
      prefix,
      codeHash: lockCode,
      type,
    });
  }
}
