import { Schema } from 'mongoose'

export const BlockSchema = new Schema({
  tip: Number,
  epoch: {
    sn: Number,
    len: Number,
    idx: Number
  },
  cellCount: Number,
  liveCount: Number,
  addrCount: Number,
  lockCount: Number, // by code hash, not lock script hash
  typeCount: Number, // by type script hash
})