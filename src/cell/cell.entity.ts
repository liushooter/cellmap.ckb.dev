import {
  Column,
  Model,
  Table,
  Index,
  PrimaryKey,
  DataType,
  Default,
  AutoIncrement,
} from 'sequelize-typescript';

@Table({
  indexes: [
    { unique: true, fields: ['hash', 'idx', 'direction'] },
    { fields: ['typeId'] },
    { fields: ['lockId', 'isLive', 'typeId'] },
    { fields: ['lockId', 'direction'] },
    { fields: ['hash', 'direction'] },
  ],
})
export class Cell extends Model<Cell> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column(DataType.CHAR(66))
  hash: string;

  @Column
  idx: number;

  @Column
  direction: boolean;

  @Column
  rId: number;

  @Index
  @Column
  blockNumber: number;

  @Column
  txIndex: number;

  @Column
  cellbase: boolean;

  @Column(DataType.DECIMAL(60, 0))
  size: number;

  @Index
  @Column(DataType.CHAR(66))
  typeId: string;

  @Default('')
  @Column(DataType.CHAR(4))
  typeType: string;

  @Default('')
  @Column(DataType.CHAR(66))
  typeCode: string;

  @Default('')
  @Column
  typeArgs: string;

  @Index
  @Column(DataType.CHAR(66))
  lockId: string;

  @Column(DataType.CHAR(4))
  lockType: string;

  @Column(DataType.CHAR(66))
  lockCode: string;

  @Column
  lockArgs: string;

  @Column
  dataLen: number;

  @Column
  isLive: boolean;

  @Column(DataType.BIGINT)
  time: number;
}
