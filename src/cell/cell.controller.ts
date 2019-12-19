import { Controller, Get } from '@nestjs/common';
import { CellService } from './cell.service';

@Controller('cell')
export class CellController {
    constructor(private readonly cellService: CellService) { }

    @Get('live')

    async countLive() {
        const count = await this.cellService.liveCount()
        return count
    }

    @Get('test')

    async test() {
        for (let i = 1000; i < 1010; i++) {
            console.log('Processing Block: ', i)
            await this.cellService.extractFromBlock(i)
        }
    }
}
