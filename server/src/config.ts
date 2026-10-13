import cors from 'cors';

function normalizedUrl(value: string): string {
  return value.trim().replace(/\/$/, '');
}

function configuredOrigins(): string[] {
  const configured = process.env.CLIENT_ORIGINS || process.env.CLIENT_URL || 'https://noteroot-ai.vercel.app';
  const origins = configured
    .split(',')
    .map(normalizedUrl)
    .filter(Boolean);

  return Array.from(new Set([...origins, 'http://localhost:5173', 'http://localhost:3000']));
}

export const config = {
  port: Number(process.env.PORT || 5000),
  mongodbUri: process.env.MONGODB_URI || '',
  allowedOrigins: configuredOrigins(),
};

export const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    if (!origin || config.allowedOrigins.includes(normalizedUrl(origin))) {
      callback(null, true);
      return;
    }
    callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
};
