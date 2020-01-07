import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn, Index} from 'typeorm';

@Entity()
export class Cell{
  @PrimaryColumn({type: 'char', length: 66})
  hash: string

  @PrimaryColumn()
  idx: number 

  @Column()
  blockNumebr: number

  @Column()
  txIndex: number

  @Column()
  cellbase: boolean

  @Column("decimal", { precision: 60, scale: 0 })
  size: number;

  @Index()
  @Column({type: 'char', length: 66})
  typeId: string;

  @Column({type: 'char', length: 4, default: ''})
  typeType: string;

  @Column({type: 'char', length: 66, default: ''})
  typeCode: string;

  @Column({default: ''})
  typeArgs: string;

  @Index()
  @Column({type: 'char', length: 66})
  lockId: string;

  @Column({type: 'char', length: 4})
  lockType: string;

  @Column({type: 'char', length: 66})
  lockCode: string;

  @Column()
  lockArgs: string;

  @Column()
  dataLen: number;

  @Column()
  isLive: boolean;

  @Column({type: 'bigint'})
  time: number;

  @Index()
  @Column({type: 'char', length: 66, default: ''})
  cHash: string

  @Column({default: null})
  cIdx: number

  @Column({default: null})
  cBlockNumber: number

  @Column({type: 'bigint', default: null})
  cTime: number 

}
