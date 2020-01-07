import { Cell } from './cell.entity';

export const cellsProviders = [
  {
    provide: 'CELLS_REPOSITORY',
    useValue: Cell,
  },
];