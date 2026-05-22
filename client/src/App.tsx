import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import AppShell from './components/Layout/AppShell';
import Dashboard from './pages/Dashboard';
import NoteEditorPage from './pages/NoteEditorPage';
import GraphPage from './pages/GraphPage';
import AIChatPage from './pages/AIChatPage';
import PluginsPage from './pages/PluginsPage';
import SettingsPage from './pages/SettingsPage';
import AuthPage from './pages/AuthPage';
import { useEffect } from 'react';
import { useNoteStore } from './stores/noteStore';
import { useAuthStore } from './stores/authStore';

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

  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

export default App;
