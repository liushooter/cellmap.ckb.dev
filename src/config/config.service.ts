import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { LoggerTransport } from 'nest-logger';

export class ConfigService {
  private readonly envConfig: Record<string, string>;

  constructor(filePath: string) {
    this.envConfig = dotenv.parse(fs.readFileSync(filePath));
    //  console.log('envConfig', this.envConfig);
  }

  get(key: string): string {
    return this.envConfig[key];
  }

  get ETH_LOCK_TYPE_ID(): string {
    return this.envConfig.ETH_LOCK_TYPE_ID;
  }

  get ETH_LOCK_TX_HASH(): string {
    return this.envConfig.ETH_LOCK_TX_HASH;
  }

  get CKB_PRIVATE_KEY(): string {
    return this.envConfig.CKB_PRIVATE_KEY;
  }

  get CKB_RPC_ENDPOINT(): string {
    return this.envConfig.CKB_RPC_ENDPOINT || 'http://127.0.0.1:8114';
  }

  get serviceName(): string {
    return 'cellmap';
  }

  get logger(): {
    path: string;
    colorize: boolean;
    logLevel: string;
  } {
    return {
      path: './logs/',
      colorize: true,
      logLevel: 'info',
    };
  }

  get redis(): { url: string } {
    return { url: 'redis://:127.0.0.1:6379/1' };
  }

  get tokenList(): Array<{ symbol: string; address: string; decimal: number }> {
    return [
      {
        symbol: 'ETH',
        address: '',
        decimal: 18,
      },
      {
        symbol: 'USDT',
        address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        decimal: 18,
      },
    ];
  }
}
