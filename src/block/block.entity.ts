import { Column, Model, Table, Index, PrimaryKey, DataType, Default, AutoIncrement} from 'sequelize-typescript';


@Table
export class Block extends Model<Block>{
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column(DataType.BIGINT)
  tip: number;

  @Default(0)
  @Column(DataType.BIGINT)
  sn: number;

  @Default(0)
  @Column(DataType.BIGINT)
  len: number;

  @Default(0)
  @Column(DataType.BIGINT)
  idx: number;

  @Default(0)
  @Column(DataType.BIGINT)
  cellCount: number;

  @Default(0)
  @Column(DataType.BIGINT)
  liveCount: number;

  @Default(0)
  @Column(DataType.BIGINT)
  addrCount: number;

  @Default(0)
  @Column(DataType.BIGINT)
  lockCount: number;
  
  @Default(0)
  @Column(DataType.BIGINT)
  typeCount: number;
}
