import { Column, Model, Table, Index, PrimaryKey, DataType, Default, AutoIncrement} from 'sequelize-typescript';

@Table
export class Cell extends Model<Cell>{

  @PrimaryKey
  @Column(DataType.CHAR(66))
  hash: string

  @PrimaryKey
  @Column
  idx: number 

  @PrimaryKey
  @Column
  direction: boolean

  @Index
  @Column
  blockNumber: number

  @Column
  txIndex: number

  @Column
  cellbase: boolean

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
