import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose'
import { CellController } from './cell.controller';
import { CellService } from './cell.service';
import { CellSchema } from './schemas/cell.schema'
import { CkbModule } from 'src/ckb/ckb.module';

@Module({
  imports: [
    MongooseModule.forFeature([{name: 'Cell', schema: CellSchema}]),
    CkbModule
  ],
  controllers: [CellController],
  providers: [CellService],
  exports: [CellService]
})
export class CellModule {}
