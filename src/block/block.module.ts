import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose'
import { BlockService } from './block.service'
import { BlockController } from './block.controller';
import { BlockSchema } from './schemas/block.schema'
import { CellModule } from 'src/cell/cell.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Block', schema: BlockSchema }]),
    CellModule
  ],
  providers: [BlockService],
  exports: [BlockService],
  controllers: [BlockController]
})

export class BlockModule {}
