import { Block } from './block.entity';

export const blocksProviders = [
  {
    provide: 'BLOCKS_REPOSITORY',
    useValue: Block,
  },
];