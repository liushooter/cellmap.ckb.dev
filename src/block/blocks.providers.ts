import { SyncStat } from './syncstat.entity';
import {SYNCSTAT_REPOSITORY} from '../util/constant';

export const blocksProviders = [
  {
    provide: SYNCSTAT_REPOSITORY,
    useValue: SyncStat,
  },
];
