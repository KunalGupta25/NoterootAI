import { randomUUID } from 'crypto';
import mongoose, { Schema, Document } from 'mongoose';

export interface INote extends Document {
  userId: string;
  title: string;
  content: string;
  tags: string[];
  parentId: string | null;
  icon: string;
  properties: Record<string, string>;
  backlinks: string[];
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema: Schema = new Schema(
  {
    _id: { type: String, required: true, default: randomUUID },
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true, default: 'Untitled Note' },
    content: { type: String, default: '' },
    tags: [{ type: String }],
    parentId: { type: String, default: null },
    icon: { type: String, default: '📄' },
    properties: { type: Schema.Types.Mixed, default: {} },
    backlinks: [{ type: String, ref: 'Note' }],
  },
  { timestamps: true }
);

export default mongoose.model<INote>('Note', NoteSchema);
