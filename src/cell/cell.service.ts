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
      const inputs = tx.inputs.map(async(input) => this.kill(input))
      const outputs = tx.outputs.map(async(output, index) => this.born(tx.hash, index, output))
      await Promise.all([
        await Promise.all(inputs),
        await Promise.all(outputs)
      ])
    }
  }

  async kill(input: CKBComponents.CellInput) {
    const { previousOutput: { index, txHash } } = input
    const cid = `${txHash}+${index}`
    const cell = await this.liveModel.findOneAndDelete({ cid })
    cell && await this.deadModel.create(cell.toObject())
  }

  async born(hash: CKBComponents.Hash, index: Number, output: CKBComponents.CellOutput) {
    const cid = `${hash}+0x${index.toString(16)}`
    const size = output.capacity
    const type = output.type ? this.ckb.utils.scriptToHash(output.type) : ''
    await this.liveModel.create({ cid, size, type })
  }

  async liveCount(): Promise<Number> {
    return await this.liveModel.count({})
  }
}
