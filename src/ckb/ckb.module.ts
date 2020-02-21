
import { Module, Global } from '@nestjs/common';
import { CkbService } from './ckb.service';
import { ConfigModule } from 'src/config/config.module';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [CkbService],
  exports: [CkbService]
})
export class CkbModule {}
