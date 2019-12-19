import { Document } from 'mongoose'

export interface Dead extends Document {
  readonly cid: string;
  readonly size: string;
  readonly type: string;
}