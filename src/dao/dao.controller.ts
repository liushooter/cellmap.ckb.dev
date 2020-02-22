import { Controller, Get, Query } from '@nestjs/common';
import { DaoService } from './dao.service';

@Controller('dao')
export class DaoController {
  constructor(private readonly daoService: DaoService) {}

  @Get('daoList')
  public async getDaos(@Query('lockHash') lockHash) {
    return await this.daoService.getDaoCells(lockHash);
  }
}
