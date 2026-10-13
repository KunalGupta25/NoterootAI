import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import AppShell from './components/Layout/AppShell';
import { lazy, Suspense, useEffect } from 'react';
import { useNoteStore } from './stores/noteStore';
import { useAuthStore } from './stores/authStore';
import { useSettingsStore } from './stores/settingsStore';
import { usePluginStore } from './stores/pluginStore';
import PluginRuntime from './plugins/runtime/PluginRuntime';
import { PluginOverlays } from './plugins/slots/PluginOverlays';

// Built-in Plugins
import { markdownImporterPlugin } from './plugins/builtin/markdownImporter';
import { zipImporterPlugin } from './plugins/builtin/zipImporter';
import { tabManagerPlugin } from './plugins/builtin/tabManager';
import { noteDownloaderPlugin } from './plugins/builtin/noteDownloader';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const NoteEditorPage = lazy(() => import('./pages/NoteEditorPage'));
const GraphPage = lazy(() => import('./pages/GraphPage'));
const AIChatPage = lazy(() => import('./pages/AIChatPage'));
const PluginsPage = lazy(() => import('./pages/PluginsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));

function RouteFallback() {
  return <div style={{ padding: '24px', color: 'var(--muted)' }}>Loading…</div>;
}

// Immediately create a new note and redirect to it (so vault stays in sync)
function NewNotePage() {
  const { saveNote } = useNoteStore();
  const navigate = useNavigate();
  useEffect(() => {
    saveNote({ title: 'Untitled', parentId: null, icon: '📄' }).then(id => {
      navigate(`/notes/${id}`, { replace: true });
    });
  }, []);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontSize: '14px' }}>
      Creating page...
    </div>
  );
}

function App() {
  const token = useAuthStore((state) => state.token);
  const syncSettings = useSettingsStore((state) => state.syncSettings);
  const theme = useSettingsStore((state) => state.theme);
  const { plugins, isLoaded, initPlugins } = usePluginStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (token) {
      syncSettings();
      if (!isLoaded) {
        initPlugins();
      }
    }
  }, [token, syncSettings, isLoaded, initPlugins]);

  // Init PluginRuntime once plugins are loaded from storage
  useEffect(() => {
    if (isLoaded) {
      // 1. Init community plugins (this clears the registry)
      PluginRuntime.init(plugins.filter(p => p.source === 'community')).then(() => {
        // 2. Manually register and execute built-in plugins if enabled
        const enabledBuiltins = plugins.filter(p => p.source === 'builtin' && p.enabled).map(p => p.id);
        
        if (enabledBuiltins.includes('core-markdown-importer')) markdownImporterPlugin();
        if (enabledBuiltins.includes('core-zip-importer')) zipImporterPlugin();
        if (enabledBuiltins.includes('core-tab-manager')) tabManagerPlugin();
        if (enabledBuiltins.includes('core-note-downloader')) noteDownloaderPlugin();
      });
    }
  }, [isLoaded, plugins]);

  // Auto-install missing synced plugins from other devices
  useEffect(() => {
    if (isLoaded && token) {
      const syncedUrls = useSettingsStore.getState().installedCommunityPlugins || [];
      const localUrls = plugins.map(p => p.url).filter(Boolean) as string[];
      const missingUrls = syncedUrls.filter(url => !localUrls.includes(url));
      
      for (const url of missingUrls) {
        usePluginStore.getState().installFromUrl(url);
      }
    }
  }, [isLoaded, token, plugins.length]);

  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/" element={token ? <AppShell /> : <Navigate to="/auth" replace />}>
          <Route index element={<Dashboard />} />
          <Route path="notes/new" element={<NewNotePage />} />
          <Route path="notes/:id" element={<NoteEditorPage />} />
          <Route path="graph" element={<GraphPage />} />
          <Route path="chat" element={<AIChatPage />} />
          <Route path="plugins" element={<PluginsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      </Suspense>
      <PluginOverlays />
    </BrowserRouter>
  );
}

export default App;
