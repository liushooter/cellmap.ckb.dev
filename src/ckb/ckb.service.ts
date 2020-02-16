/// <reference types="@nervosnetwork/ckb-types" />

import { Injectable } from '@nestjs/common';
import Core from '@nervosnetwork/ckb-sdk-core'
import * as http from 'http'

// const ckb = new Core('http://api.yamen.co:8114')
// const ckb = new Core('http://api.yamen.co:8114')
const ckb = new Core('http://127.0.0.1:8114')
let chain = 'ckb';
ckb.rpc.setNode({ httpAgent: new http.Agent({ keepAlive: true }) } as CKBComponents.Node)
ckb.rpc.getBlockchainInfo().then((result)=>{
  console.log('blockchainInfo', result);
  chain = result.chain;
})

@Injectable()
export class CkbService {
  getCKB() {
    return ckb
  }

  getChain(){
    return chain;
  }

}
