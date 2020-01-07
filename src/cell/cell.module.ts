import { Module } from '@nestjs/common';
import { CellController } from './cell.controller';
import { CellService } from './cell.service';
import { CkbModule } from 'src/ckb/ckb.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cell } from './cell.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cell]),
    CkbModule
  ],
  controllers: [CellController],
  providers: [CellService],
  exports: [CellService]
})
export class CellModule {}
