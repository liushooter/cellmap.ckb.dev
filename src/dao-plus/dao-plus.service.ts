import { Injectable, Inject } from '@nestjs/common';
import { LoggerService } from 'nest-logger';
import { ConfigService } from 'src/config/config.service';
import { CELLS_REPOSITORY, DAO_TYPE_ID } from 'src/util/constant';
import { Cell } from 'src/cell/cell.entity';
import * as ckbUtils from '@nervosnetwork/ckb-sdk-utils';
import { DaoService } from 'src/dao/dao.service';

@Injectable()
export class DaoPlusService {
  constructor(
    @Inject(CELLS_REPOSITORY) private readonly cellModel: typeof Cell,
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
    private readonly daoService: DaoService,
  ) {}

  async getDaoPlusCells(lockHash) {
    const condition = {
      typeCode: this.configService.UPGRADE_CODE_HASH,
      typeType: 'data',
      isLive: true,
    };
    if (lockHash) {
      Object.assign(condition, { lockId: lockHash });
    }
    const keyCells = await this.cellModel.findAll({
      where: condition,
      order: [['id', 'desc']],
    });

    const daoPlusCells = [];
    for (const keyCell of keyCells) {
      const { typeId } = keyCell;

      const daoPlusLockHash = ckbUtils.scriptToHash({
        codeHash: this.configService.KEY_LOCK_TYPE_ID,
        hashType: 'type',
        args: typeId,
      });

      const daoPlusCell = await this.cellModel.findOne({
        where: {
          lockId: daoPlusLockHash,
          typeId: DAO_TYPE_ID,
          isLive: true,
        },
      });
      if (!daoPlusCell) {
        console.log('daoPluCell not exist', daoPlusLockHash);
        continue;
      }
      console.log('daoPluCell exist', daoPlusLockHash);

      const daoCell = await this.daoService.reformatDaoCell(daoPlusCell);
      const formatedKeyCell = this.formatKeyCell(keyCell);
      daoPlusCells.push({ daoCell, keyCell: formatedKeyCell });
    }

    return daoPlusCells;
  }

  formatKeyCell(cell) {
    const {
      hash,
      idx,
      size,
      lockCode,
      lockType,
      lockArgs,
      typeCode,
      typeType,
      typeArgs,
    } = cell;

    const outPoint = {
      txHash: hash,
      index: idx,
    };

    const lock = {
      codeHash: lockCode,
      hashType: lockType,
      args: lockArgs,
    };

    const type = {
      codeHash: typeCode,
      hashType: typeType,
      args: typeArgs,
    };

    return {
      capacity: size,
      lock,
      type,
      outPoint,
    };
  }

  async getDaoPlusConfig() {
    return {
      key_lock_type_id: this.configService.KEY_LOCK_TYPE_ID,
      upgrade_code_hash: this.configService.UPGRADE_CODE_HASH,
      key_lock_tx_hash: this.configService.KEY_LOCK_TX_HASH,
      key_lock_cell_dep: {
        depType: 'code',
        outPoint: {
          txHash: this.configService.KEY_LOCK_TX_HASH,
          index: '0x0',
        },
      },
      upgrade_cell_dep: {
        depType: 'code',
        outPoint: {
          txHash: this.configService.UPGRADE_TX_HASH,
          index: '0x0',
        },
      },
    };
  }
}
