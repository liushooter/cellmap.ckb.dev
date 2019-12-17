import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose'
import { ScheduleModule } from 'nest-schedule'
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BlockModule } from './block/block.module';
import { CellModule } from './cell/cell.module';
import { CkbModule } from './ckb/ckb.module';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost/cellmap', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
    }),
    ScheduleModule.register(),
    BlockModule,
    CellModule,
    CkbModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
