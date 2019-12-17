import { Document } from 'mongoose'

export interface Block extends Document {
  readonly tip: number
  readonly epoch: {
    readonly sn: number
    readonly len: number
    readonly idx: number
  }
  readonly cellCount: number
  readonly liveCount: number
  readonly addrCount: number
  readonly lockCount: number
  readonly typeCount: number
}