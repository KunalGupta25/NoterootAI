import mongoose, { Schema, Document } from 'mongoose';

export interface IMarketplacePlugin extends Document {
  pluginId: string;
  name: string;
  author: string;
  description: string;
  version: string;
  githubUrl?: string;
  readme: string;
  code: string;
  downloads: number;
  createdAt: Date;
  updatedAt: Date;
}

const MarketplacePluginSchema: Schema = new Schema(
  {
    pluginId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    author: { type: String, required: true },
    description: { type: String, default: '' },
    version: { type: String, required: true },
    githubUrl: { type: String },
    readme: { type: String, required: true },
    code: { type: String, required: true },
    downloads: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<IMarketplacePlugin>('MarketplacePlugin', MarketplacePluginSchema);
