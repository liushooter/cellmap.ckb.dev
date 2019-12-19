import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose'
import { CellController } from './cell.controller';
import { CellService } from './cell.service';
import { LiveSchema } from './schemas/live.schema'
import { DeadSchema } from './schemas/dead.schema'
import { CkbModule } from 'src/ckb/ckb.module';

@Module({
  imports: [
    MongooseModule.forFeature([{name: 'Live', schema: LiveSchema}]),
    MongooseModule.forFeature([{name: 'Dead', schema: DeadSchema}]),
    CkbModule
  ],
  controllers: [CellController],
  providers: [CellService],
  exports: [CellService]
})
export class CellModule {}
