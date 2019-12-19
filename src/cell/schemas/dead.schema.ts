import { Schema } from 'mongoose'

export const DeadSchema = new Schema({
  cid: String,     // {txHash}+{index}
  size: String,   // hex string of capacity
  type: String,   // type script hash
})