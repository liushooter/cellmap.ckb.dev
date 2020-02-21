import * as dotenv from 'dotenv';
import * as fs from 'fs';

export class ConfigService {
  private readonly envConfig: Record<string, string>;

  constructor(filePath: string) {
    this.envConfig = dotenv.parse(fs.readFileSync(filePath))
    console.log('envConfig', this.envConfig)
  }

  get(key: string): string {
    return this.envConfig[key];
  }

  get ETH_LOCK_TYPE_ID(): string {
    return this.envConfig.ETH_LOCK_TYPE_ID
  }

  get ETH_LOCK_TX_HASH(): string {
    return this.envConfig.ETH_LOCK_TX_HASH
  }

  get CKB_RPC_ENDPOINT(): string {
    return this.envConfig.CKB_RPC_ENDPOINT || 'http://127.0.0.1:8114';
  }

}
