/// <reference types="@nervosnetwork/ckb-types" />

import { Injectable } from '@nestjs/common';
import Core from '@nervosnetwork/ckb-sdk-core';
import * as http from 'http';
import { ConfigService } from 'src/config/config.service';

@Injectable()
export class CkbService {
  private ckb: Core;
  private chain: string;

  constructor(private readonly config: ConfigService) {

    this.ckb = new Core(this.config.CKB_RPC_ENDPOINT);
    this.chain = 'ckb';

    this.ckb.rpc.setNode({
      httpAgent: new http.Agent({ keepAlive: true }),
    } as CKBComponents.Node);

    this.ckb.rpc.getBlockchainInfo().then(result => {
      // console.log('connect CKB chain rpc response', result);
      this.chain = result.chain;
    });

  }

  /**
   * return ckb instance
   */
  getCKB(): Core {
    return this.ckb;
  }

  /**
   * return ckb chain type "ckb" or "ckt"
   */
  getChain(): string {
    return this.chain;
  }
}
