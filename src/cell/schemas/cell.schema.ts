import { Schema } from 'mongoose'

export const CellSchema = new Schema({
  cid: String,     // {txHash}+{index}
  size: String,   // hex string of capacity
  type: String,   // type script hash
  live: Boolean   // live cell or not
})