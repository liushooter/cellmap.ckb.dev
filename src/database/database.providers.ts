import { Sequelize } from 'sequelize-typescript';
// import { Cat } from '../cats/cat.entity';
import {Block} from '../block/block.entity'
import {Cell} from '../cell/cell.entity'

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
        logging: false
      });
      sequelize.addModels([Cell, Block]);
      await sequelize.sync({force: false});
      return sequelize;
    },
  },
];