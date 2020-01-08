import { Cell } from './cell.entity';
import { Block } from './block.entity';
import {CELLS_REPOSITORY, BLOCKS_REPOSITORY} from '../util/constant'

export const cellsProviders = [
  {
    provide: CELLS_REPOSITORY,
    useValue: Cell,
  },
  {
    provide: BLOCKS_REPOSITORY,
    useValue: Block,
  },
];