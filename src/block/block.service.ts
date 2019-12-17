import { Model } from 'mongoose'
import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Interval, NestSchedule } from 'nest-schedule'
import { Block } from './interfaces/block.interface'
import { CkbService } from '../ckb/ckb.service'
import { CellService } from 'src/cell/cell.service'

@Injectable()
export class BlockService extends NestSchedule {
  constructor(
    @InjectModel('Block') private readonly blockModel: Model<Block>,
    private readonly ckbService: CkbService,
    private readonly cellService: CellService
  ){ super() }

  private readonly ckb = this.ckbService.getCKB()

  private syncing = false

  @Interval(10 * 1000)
  async sync() {
    if (this.syncing) { 
      console.log('Sync Skipped')
      return 
    }

    this.syncing = true

    const header = await this.ckb.rpc.getTipHeader()
    const last = await this.update(header)
    const block = await this.blockModel.findOne()

    for (let i = last.tip + 1; i <= block.tip; i++) {
      await this.cellService.extractFromBlock(i)
      i === block.tip && console.log(`Synced from ${last.tip + 1} to ${block.tip}\n`)
    }

    this.syncing = false
  }

  async update(header: CKBComponents.BlockHeader): Promise<Block> {

    const tip = parseInt(header.number, 16)

    const epochString = header.epoch.slice(2) // remove '0x'
    const sn = parseInt(epochString.slice(-6), 16)
    const idx = parseInt(epochString.slice(-10, -6), 16)
    const len = parseInt(epochString.slice(-14, -10), 16)
    const epoch = { sn, len, idx }

    let block = await this.blockModel.findOneAndUpdate({}, { tip, epoch })
    !block && (block = await this.blockModel.create({ tip: -1, epoch }))

    return block
  }

  async getTipBlockHeader(): Promise<CKBComponents.BlockHeader> {
    return await this.ckb.rpc.getTipHeader()
  }
  async getBlockByNumber(height: Number): Promise<CKBComponents.Block> {
    let hexHeight = '0x' + height.toString(16)
    return await this.ckb.rpc.getBlockByNumber(hexHeight)
  }
}
