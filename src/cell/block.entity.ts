import { Column, Model, Table, Index, PrimaryKey, DataType, Default, AutoIncrement} from 'sequelize-typescript';

@Table
export class Block extends Model<Block> {
  @PrimaryKey
  @Column(DataType.BIGINT)
  number: number;

  @Column(DataType.CHAR(66))
  hash: string;

  @Default(0)
  @Column(DataType.BIGINT)
  epochNumber: number;

  @Default(0)
  @Column(DataType.BIGINT)
  epochIndex: number;

  @Default(0)
  @Column(DataType.BIGINT)
  epochLength: number;

  @Column(DataType.BIGINT)
  timestamp: number;

  @Column(DataType.CHAR(66))
  dao: string;

  @Column(DataType.INTEGER)
  transactionCount: number;
}
