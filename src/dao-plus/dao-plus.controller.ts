import { Controller, Get, Query } from '@nestjs/common';
import { DaoPlusService } from './dao-plus.service';

@Controller('daoPlus')
export class DaoPlusController {
  constructor(private readonly daoPlusService: DaoPlusService) {}

  @Get('daoPlusConfig')
  public async daoPlusConfig() {
    return await this.daoPlusService.getDaoPlusConfig();
  }

  @Get('daoPlusList')
  public async daoPlusList(@Query('lockHash') lockHash) {
    return await this.daoPlusService.getDaoPlusCells(lockHash);
  }
}
