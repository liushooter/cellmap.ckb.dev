import { Column, Model, Table, Index, PrimaryKey, DataType, Default} from 'sequelize-typescript';
import { DECIMAL } from 'sequelize/types';

@Table
export class Cell extends Model<Cell>{

  @PrimaryKey
  @Column(DataType.CHAR(66))
  hash: string

  @PrimaryKey
  @Column
  idx: number 

  @Column
  blockNumebr: number

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

  @Index
  @Default('')
  @Column(DataType.CHAR(66))
  cHash: string

  @Default(null)
  @Column
  cIdx: number

  @Default(null)
  @Column
  cBlockNumber: number

  @Default(null)
  @Column(DataType.BIGINT)
  cTime: number 

}
