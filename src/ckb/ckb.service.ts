/// <reference types="@nervosnetwork/ckb-types" />

import { Injectable } from '@nestjs/common';
import Core from '@nervosnetwork/ckb-sdk-core'
import * as http from 'http'

const ckb = new Core('http://api.yamen.co:8114')
ckb.rpc.setNode({ httpAgent: new http.Agent({ keepAlive: true }) } as CKBComponents.Node)

@Injectable()
export class CkbService {
  getCKB() {
    return ckb
  }
}
