import { Column, Entity, PrimaryGeneratedColumn} from 'typeorm';

@Entity()
export class Block {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('int')
  tip: number;

  @Column({type: 'int', default: 0})
  sn: number;

  @Column({type: 'int', default: 0})
  len: number;

  @Column({type: 'int', default: 0})
  idx: number;

  @Column({type: 'int', default: 0})
  cellCount: number;

  @Column({type: 'int', default: 0})
  liveCount: number;

  @Column({type: 'int', default: 0})
  addrCount: number;

  @Column({type: 'int', default: 0})
  lockCount: number;
  
  @Column({type: 'int', default: 0})
  typeCount: number;
}
