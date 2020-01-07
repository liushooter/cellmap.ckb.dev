import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from 'nest-schedule'
import { BlockModule } from './block/block.module';
import { CellModule } from './cell/cell.module';
import { CkbModule } from './ckb/ckb.module';
import { Block } from './block/block.entity';
import { Cell } from './cell/cell.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'abc321456',
      database: 'ckb_test',
      entities: [Block, Cell],
      synchronize: true,
    }),
    ScheduleModule.register(),
    BlockModule,
    CellModule,
    CkbModule
  ],
})
export class AppModule {}
