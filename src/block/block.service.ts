import { Inject, Injectable } from '@nestjs/common';
import { Interval, NestSchedule } from 'nest-schedule';
import { Block } from './block.entity';
import { CkbService } from '../ckb/ckb.service';
import { CellService } from 'src/cell/cell.service';

@Injectable()
export class BlockService extends NestSchedule {
  constructor(
    // @InjectModel('Block') private readonly blockModel: Model<Block>,
    // @InjectRepository(Block)
    // private readonly blockModel: Repository<Block>,
    @Inject('BLOCKS_REPOSITORY')
    private readonly blockModel: typeof Block,
    private readonly ckbService: CkbService,
    private readonly cellService: CellService,
  ) {
    super();
  }

  private readonly ckb = this.ckbService.getCKB();

  private syncing = false;
  private syncingBlock = 0;

  @Interval(10 * 1000)
  async sync() {
    if (this.syncing) {
      console.log('Sync Skipped', this.syncingBlock);
      await this.updateTip(this.syncingBlock);
      return;
    }

    this.syncing = true;

    const header = await this.ckb.rpc.getTipHeader();
    const currentTip = parseInt(header.number, 16);
    const lastBlock = await this.blockModel.findAll();
    const lastTip = lastBlock.length > 0 ? lastBlock[0].tip : -1;

    if (this.syncingBlock < lastTip) {
      this.syncingBlock = lastTip;
    }

    // const { last, current:block } = await this.update(header)
    console.log('find one block is ', lastTip);

    for (let i = lastTip + 1; i <= currentTip; i++) {
      // console.time("start extract block " + i)
      await this.cellService.extractFromBlock(i);
      // console.time("end extract block " + i)
      this.syncingBlock = i;
      i === currentTip &&
        console.log(`Synced from ${lastTip + 1} to ${currentTip}\n`);
    }

    await this.updateTip(currentTip);
    this.syncing = false;
  }

  async updateTip(tip: Number): Promise<any> {
    let blocks = await this.blockModel.findAll();
    let block;
    if (blocks.length > 0) {
      block = blocks[0];
      block.tip = tip;
      await block.save();
      // await this.blockModel.save(block);
    } else {
      block = new Block();
      block.tip = tip;
      await block.save();
      // await this.blockModel.save(block);
    }
    return { block };
  }

  async getLastestBlock(): Promise<Block> {
    let blocks = await this.blockModel.findAll();
    return blocks.length > 0 ? blocks[0] : null;
  }

  async getTipBlockHeader(): Promise<CKBComponents.BlockHeader> {
    return await this.ckb.rpc.getTipHeader();
  }
  async getBlockByNumber(height: Number): Promise<CKBComponents.Block> {
    let hexHeight = '0x' + height.toString(16);
    return await this.ckb.rpc.getBlockByNumber(hexHeight);
  }
}
