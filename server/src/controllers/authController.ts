import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { AuthRequest, getJwtSecret } from '../middleware/auth';

const TOKEN_EXPIRES_IN = '7d';

function publicUser(user: { _id: unknown; name: string; email: string }) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
  };
}

function signToken(userId: string) {
  return jwt.sign({ userId }, getJwtSecret(), { expiresIn: TOKEN_EXPIRES_IN });
}

export const signup = async (req: Request, res: Response) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!name || !email || password.length < 8) {
      return res.status(400).json({ error: 'Name, valid email, and 8+ character password are required' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash });
    const token = signToken(String(user._id));

    res.status(201).json({ token, user: publicUser(user) });
  } catch (error) {
    console.error('Signup failed', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({ token: signToken(String(user._id)), user: publicUser(user) });
  } catch (error) {
    console.error('Login failed', error);
    res.status(500).json({ error: 'Failed to log in' });
  }
};

export const me = async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user: publicUser(user) });
};

import { encrypt, decrypt } from '../utils/crypto';

export const getSettings = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Decrypt built-in provider keys
    const decryptedKeys: Record<string, string> = {};
    if (user.providerKeys) {
      for (const [provider, encryptedKey] of user.providerKeys.entries()) {
        decryptedKeys[provider] = decrypt(encryptedKey as string);
      }
    }

    // Decrypt custom provider API keys
    const decryptedCustomProviders = (user.customProviders || []).map(cp => {
      const { apiKey, ...rest } = cp;
      return {
        ...rest,
        apiKey: apiKey ? decrypt(apiKey) : ''
      };
    });

    res.json({
      theme: user.theme || 'dark',
      providerKeys: decryptedKeys,
      customProviders: decryptedCustomProviders,
      pluginSettings: user.pluginSettings || {},
      installedCommunityPlugins: user.installedCommunityPlugins || []
    });
  } catch (error) {
    console.error('Failed to get settings', error);
    res.status(500).json({ error: 'Failed to retrieve settings' });
  }
};

export const updateSettings = async (req: AuthRequest, res: Response) => {
  try {
    const { providerKeys, customProviders } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (providerKeys && typeof providerKeys === 'object') {
      const encryptedKeys = new Map<string, string>();
      for (const [provider, key] of Object.entries(providerKeys)) {
        // Encrypt the raw key before storing
        encryptedKeys.set(provider, encrypt(String(key)));
      }
      user.providerKeys = encryptedKeys;
    }

    if (Array.isArray(customProviders)) {
      const encryptedCustomProviders = customProviders.map(cp => {
        const { apiKey, ...rest } = cp;
        return {
          ...rest,
          apiKey: apiKey ? encrypt(String(apiKey)) : ''
        };
      });
      user.customProviders = encryptedCustomProviders;
    }

    if (req.body.pluginSettings !== undefined) {
      user.pluginSettings = req.body.pluginSettings;
    }
    if (req.body.installedCommunityPlugins !== undefined) {
      user.installedCommunityPlugins = req.body.installedCommunityPlugins;
    }
    if (req.body.theme !== undefined) {
      user.theme = req.body.theme;
    }

    await user.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update settings', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};
