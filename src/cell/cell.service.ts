import { Injectable, Inject } from '@nestjs/common';
import { CkbService } from '../ckb/ckb.service';
import { Cell } from './cell.entity';
import { AddressType, AddressPrefix } from '@nervosnetwork/ckb-sdk-utils';
import { Op, QueryTypes, fn, col } from 'sequelize';

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

      const cellbase =
        tx.inputs[0].previousOutput.txHash ==
        '0x0000000000000000000000000000000000000000000000000000000000000000';

      let inputs = [];
      if (!cellbase) {
        inputs = tx.inputs.map(async (input, index) =>
          this.kill(height, i, cellbase, tx.hash, index, input, timestamp),
        );
      }

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
    txIndex: Number,
    cellbase: boolean,
    hash: CKBComponents.Hash,
    index: Number,
    input: CKBComponents.CellInput,
    time,
  ) {
    let oldWhere = {
      hash: input.previousOutput.txHash,
      idx: Number(input.previousOutput.index).valueOf(),
      direction: true,
    };

    // console.log('oldWhere', oldWhere);
    let oldCell = await this.cellModel.findOne({
      where: oldWhere,
    });

    if (oldCell) {
      const cell = new Cell();
      cell.blockNumber = height.valueOf();
      cell.txIndex = txIndex.valueOf();
      cell.hash = hash;
      cell.idx = index.valueOf();
      cell.direction = false;
      cell.size = oldCell.size;
      cell.typeId = oldCell.typeId;
      cell.typeType = oldCell.typeType;
      cell.typeArgs = oldCell.typeArgs;
      cell.typeCode = oldCell.typeCode;

      cell.lockId = oldCell.lockId;
      cell.lockArgs = oldCell.lockArgs;
      cell.lockCode = oldCell.lockCode;
      cell.lockType = oldCell.lockType;
      cell.dataLen = oldCell.dataLen;
      cell.isLive = false;
      cell.cellbase = cellbase;
      cell.time = Number(this.ckb.utils.JSBI.BigInt(time).toString());
      cell.rId = oldCell.id;
      try {
        await cell.save();

        oldCell.isLive = false;
        oldCell.rId = cell.id;
        await oldCell.save();
      } catch (err) {
        console.log('insert err', err);
      }
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
      where: {
        lockId: lockHash,
        isLive: true,
        typeId: '',
        dataLen: 0,
        direction: 1,
      },
      order: [['blockNumber', 'asc']],
      limit: 100,
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

  async getEthDeps(keccak_tx_hash) {
    const cell = await this.cellModel.findOne({
      where: { blockNumber: 0, txIndex: 0, idx: 1 },
    });

    let deps = [
      {
        depType: 'code',
        outPoint: {
          txHash: cell.hash,
          index: '0x3',
        },
      },
      {
        depType: 'code',
        outPoint: {
          txHash: keccak_tx_hash,
          index: '0x0',
        },
      },
    ];
    return deps;
  }

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
    lastBlock: number,
  ) {
    let conditions = {
      lockId: lockHash,
      blockNumber: {
        [Op.lte]: lastBlock,
      },
    };
    if (direction == 'in') {
      conditions['direction'] = 1;
    } else if (direction == 'out') {
      conditions['direction'] = 0;
    } else {
    }

    const results = await this.cellModel.findAll({
      attributes: ['hash', 'blockNumber'],
      where: conditions,
      order: [['blockNumber', 'desc']],
      limit,
    });

    // console.log('result', results);

    let fullTxs = [];

    let txhashList = results.map(x => {
      let item = x.get({ plain: true });
      return item['hash'];
    });

    console.log('txHashList', txhashList);

    const allOutputCells = await this.cellModel.findAll({
      where: { hash: { [Op.in]: txhashList }, direction: true },
      order: [['time', 'desc']],
    });

    const allInputCells = await this.cellModel.findAll({
      where: { hash: { [Op.in]: txhashList }, direction: false },
      order: [['time', 'desc']],
    });

    // console.log('allOutputCells', allOutputCells.length);

    for (let tx of results) {
      let hash = tx['hash'];
      // let time = tx['blockNumber'];
      // console.log('tx', tx, hash, time);
      let txInputCells = allInputCells
        .filter(x => x.hash === hash)
        .sort((a, b) => a.idx - b.idx);

      let txOutputCells = allOutputCells
        .filter(x => x.hash === hash)
        .sort((a, b) => a.idx - b.idx);

      console.log('input', txInputCells.length);
      console.log('output', txOutputCells.length);

      let time = txOutputCells[0].time;

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

      console.log('txInputCells', txInputCells.length);
      console.log('txOutputCells', txOutputCells.length);
      let from =
        txInputCells.length > 0
          ? this.getCellAddress(txInputCells[0])
          : 'cellbase';
      let to = this.getCellAddress(txOutputCells[0]);

      let blockNumber = txOutputCells[0].blockNumber;

      if (greaterThan(outAmount, inAmount)) {
        direction = 'in';
        amount = '0x' + subtract(outAmount, inAmount).toString(16);
      } else {
        direction = 'out';
        amount = '0x' + subtract(inAmount, outAmount).toString(16);
      }

      console.log(from, '-------------', to, '-----', amount);

      fullTxs.push({
        hash,
        time,
        from,
        to,
        amount,
        direction,
        blockNumber,
        inputSize,
        outputSize,
      });
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

  async getCapacityByLockHash(lockHash) {
    let capacity = await this.cellModel.sum('size', {
      where: { lockId: lockHash, isLive: true, direction: true },
    });
    return '0x' + capacity.toString(16);
  }

  async getDaoCells(lockHash) {
    const daoTypeHash =
      '0xcc77c4deac05d68ab5b26828f0bf4565a8d73113d7bb7e92b8362b8a74e58e58';

    let cells = await this.cellModel.findAll({
      where: {
        // lockId: lockHash,
        typeId: daoTypeHash,
        isLive: true,
      },
      order: [['blockNumber', 'desc']],
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
          typeId: daoTypeHash,
          direction: false,
        },
      });

      if (depsoitCell) {
        type = 'withdraw';
        let dCell = await this.cellModel.findByPk(depsoitCell.rId);
        depositBlockNumber = dCell.blockNumber;
        withdrawBlockNumber = blockNumber;
      }

      daoCells.push({
        hash,
        idx,
        size,
        depositBlockNumber,
        withdrawBlockNumber,
        type,
      });
    }

    return daoCells;
  }
}
