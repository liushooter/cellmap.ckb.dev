import { Schema } from 'mongoose'

export const LiveSchema = new Schema({
  cid: String,     // {txHash}+{index}
  size: String,   // hex string of capacity
  type: String,   // type script hash
})