import { randomUUID } from 'crypto';
import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  providerKeys: Map<string, string>;
  customProviders: any[];
  pluginSettings: Map<string, any>;
  installedCommunityPlugins: string[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    _id: { type: String, default: randomUUID },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    providerKeys: { type: Map, of: String, default: {} },
    customProviders: { type: Array, default: [] },
    pluginSettings: { type: Map, default: {} },
    installedCommunityPlugins: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);
