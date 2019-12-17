
import { Module, Global } from '@nestjs/common';
import { CkbService } from './ckb.service';

@Global()
@Module({
  providers: [CkbService],
  exports: [CkbService]
})
export class CkbModule {}
