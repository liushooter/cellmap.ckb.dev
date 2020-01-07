import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockService } from './block.service'
import { BlockController } from './block.controller';
import { Block } from './block.entity'
import { CellModule } from 'src/cell/cell.module';

@Module({
  // imports: [
  //   MongooseModule.forFeature([{ name: 'Block', schema: BlockSchema }]),
  //   CellModule
  // ],
  imports: [TypeOrmModule.forFeature([Block]), CellModule],
  providers: [BlockService],
  exports: [BlockService],
  controllers: [BlockController]
})

export class BlockModule {}
