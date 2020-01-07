import { Module } from '@nestjs/common';
import { ScheduleModule } from 'nest-schedule'
import { BlockModule } from './block/block.module';
import { CellModule } from './cell/cell.module';
import { CkbModule } from './ckb/ckb.module';

@Module({
  imports: [
    ScheduleModule.register(),
    BlockModule,
    CellModule,
    CkbModule
  ],
})
export class AppModule {}
