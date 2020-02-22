import { Column, Model, Table, Index, PrimaryKey, DataType, Default, AutoIncrement} from 'sequelize-typescript';

@Table
export class SyncStat extends Model<SyncStat> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column(DataType.BIGINT)
  tip: number;
}
