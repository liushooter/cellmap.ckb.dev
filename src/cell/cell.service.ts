import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Live } from './interfaces/live.interface'
import { Dead } from './interfaces/dead.interface'
import { CkbService } from '../ckb/ckb.service'
import { CreateCellDto } from './dto/create-cell.dto';

@Injectable()
export class CellService {
  constructor(
    @InjectModel('Live') private readonly liveModel: Model<Live>,
    @InjectModel('Dead') private readonly deadModel: Model<Dead>,
    private readonly ckbService: CkbService
   ) {}

  private readonly ckb = this.ckbService.getCKB()

  async extractFromBlock(height: Number) {

    const block = await this.ckb.rpc.getBlockByNumber('0x' + height.toString(16))

    console.log(`========== BLOCK ${height} ==========`)

    for(const tx of block.transactions) {
      for (const input of tx.inputs) {
        const { previousOutput: { index, txHash } } = input
        const cid = `${txHash}+${index}`
        let cell = await this.liveModel.findOneAndDelete({ cid })
        console.log(cell)
        cell = cell.toObject()
        console.log(cell)
        await this.deadModel.create(cell)
        // cell && console.log(`[ --- Cell Dead ] - [${cell.cid}]`)
      }

      for (const [index, output] of tx.outputs.entries()) {
        const cid = `${tx.hash}+0x${index.toString(16)}`
        const size = output.capacity
        const type = output.type ? this.ckb.utils.scriptToHash(output.type) : ''
        const cell = await this.liveModel.create({ cid, size, type })
        console.log(`[ +++ Cell Live ] - [${cell.cid}]`)
      }
    }
  }

  async liveCount(): Promise<Number> {
    return await this.liveModel.count({})
  }
}
