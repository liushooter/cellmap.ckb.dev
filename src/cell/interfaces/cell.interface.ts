import { Document } from 'mongoose'

export interface Cell extends Document {
  readonly cid: string;
  readonly size: string;
  readonly type: string;
  readonly live: boolean;
}