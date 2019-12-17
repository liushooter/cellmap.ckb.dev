import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cell } from './interfaces/cell.interface'
import { CreateCellDto } from './dto/create-cell.dto';
import { CkbService } from '../ckb/ckb.service'

@Injectable()
export class CellService {
  constructor(
    @InjectModel('Cell') private readonly cellModel: Model<Cell>,
    private readonly ckbService: CkbService
   ) {}

  private readonly ckb = this.ckbService.getCKB()

  async loadCells(): Promise<CachedCell[]> {
    const lockHash = this.ckb.utils.scriptToHash({
      codeHash: '0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8',
      args: '0xc2baa1d5b45a3ad6452b9c98ad8e2cc52e5123c7',
      hashType: 'type'
    })
    return await this.ckb.loadCells({ lockHash, end: '0x108' })
  }

  async extractFromBlock(height: Number) {

    const block = await this.ckb.rpc.getBlockByNumber('0x' + height.toString(16))

    console.log(`========== BLOCK ${height} ==========`)

    for(const tx of block.transactions) {
      for (const input of tx.inputs) {
        const { previousOutput: { index, txHash } } = input
        const cid = `${txHash}+${index}`
        const cell = await this.cellModel.findOneAndUpdate({ cid }, { cid, live: false })
        // cell && console.log(`[ --- Cell Dead ] - [${cell.cid}]`)
      }

      for (const [index, output] of tx.outputs.entries()) {
        const cid = `${tx.hash}+0x${index.toString(16)}`
        if (await this.cellModel.findOne({ cid })) { return }
        const size = output.capacity
        const type = output.type ? this.ckb.utils.scriptToHash(output.type) : ''
        const cell = await this.cellModel.create({ cid, size, type, live: true})
        // console.log(`[ +++ Cell Live ] - [${cell.cid}]`)
      }
    }
  }

  async findLive(): Promise<Cell[]> {
    return await this.cellModel.find({live: true})
  }

  async findAll(): Promise<Cell[]> {
    return await this.cellModel.find().exec()
  }
}
