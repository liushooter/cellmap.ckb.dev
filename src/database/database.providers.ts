import { Sequelize } from 'sequelize-typescript';
// import { Cat } from '../cats/cat.entity';
import {Block} from '../cell/block.entity'
import {Cell} from '../cell/cell.entity'
import { SyncStat } from 'src/block/syncstat.entity';

export const databaseProviders = [
  {
    provide: 'SEQUELIZE',
    useFactory: async () => {
      const sequelize = new Sequelize({
        dialect: 'mysql',
        host: 'localhost',
        port: 3306,
        username: 'root',
        password: 'abc321456',
        database: 'ckb_test_1',
        logging: true
      });
      sequelize.addModels([Cell, Block, SyncStat]);
      await sequelize.sync({force: false});
      return sequelize;
    },
  },
];