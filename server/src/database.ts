import mongoose from 'mongoose';

export function connectMongo(uri: string): void {
  if (!uri) {
    console.warn('No MONGODB_URI provided. Running without a MongoDB connection.');
    return;
  }

  mongoose
    .connect(uri)
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch((error: unknown) => console.error('MongoDB connection error:', error));

  mongoose.connection.on('disconnected', () => {
    console.warn('[MongoDB] Disconnected — the driver will retry according to its configuration.');
  });
  mongoose.connection.on('error', (error: unknown) => {
    console.error('[MongoDB] Connection error:', error);
  });
}
