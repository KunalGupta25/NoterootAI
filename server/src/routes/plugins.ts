import express from 'express';
import MarketplacePlugin from '../models/MarketplacePlugin';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Get all published plugins for the marketplace
router.get('/market', requireAuth, async (req, res) => {
  try {
    const plugins = await MarketplacePlugin.find({}, '-code').sort({ downloads: -1, createdAt: -1 });
    res.json(plugins);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Download/Install a plugin (increments download counter and returns the full source code)
router.get('/market/:pluginId', requireAuth, async (req, res) => {
  try {
    const plugin = await MarketplacePlugin.findOneAndUpdate(
      { pluginId: req.params.pluginId },
      { $inc: { downloads: 1 } },
      { new: true }
    );
    if (!plugin) {
      return res.status(404).json({ error: 'Plugin not found' });
    }
    res.json(plugin);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Publish a new plugin
router.post('/publish', requireAuth, async (req, res) => {
  try {
    const { pluginId, name, author, description, version, githubUrl, readme, code } = req.body;

    if (!pluginId || !name || !readme || !code) {
      return res.status(400).json({ error: 'Missing required plugin structure (pluginId, name, readme, code)' });
    }

    // Check if pluginId already exists
    const existing = await MarketplacePlugin.findOne({ pluginId });
    if (existing) {
      // Allow the original author to update it
      if (existing.author !== author) {
         return res.status(403).json({ error: `A plugin with ID '${pluginId}' already exists and is owned by a different author.` });
      }
      
      existing.name = name;
      existing.description = description;
      existing.version = version;
      existing.githubUrl = githubUrl;
      existing.readme = readme;
      existing.code = code;
      await existing.save();
      return res.json(existing);
    }

    const plugin = new MarketplacePlugin({
      pluginId,
      name,
      author,
      description,
      version,
      githubUrl,
      readme,
      code
    });
    await plugin.save();

    res.json(plugin);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'A plugin with this ID already exists.' });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;
