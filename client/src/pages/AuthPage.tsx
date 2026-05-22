import { useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Box, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useNoteStore } from '../stores/noteStore';

export default function AuthPage() {
  const { token, login, signup } = useAuthStore();
  const { initDB } = useNoteStore();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (token) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'signup') {
        await signup(name, email, password);
      } else {
        await login(email, password);
      }
      await initDB();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      background: 'var(--bg)',
      padding: '24px',
    }}>
      <form onSubmit={handleSubmit} style={{
        width: '100%',
        maxWidth: '420px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '28px',
        boxShadow: '0 18px 60px rgba(0,0,0,0.18)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <Box size={26} style={{ color: 'var(--accent)' }} />
          <div>
            <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '24px' }}>NoteRootAI</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '13px' }}>
              {mode === 'signup' ? 'Create your cloud vault account' : 'Sign in to your cloud vault'}
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '18px', background: 'var(--bg)', padding: '4px', borderRadius: '8px' }}>
          {(['login', 'signup'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              style={{
                border: 'none',
                borderRadius: '6px',
                padding: '8px 10px',
                cursor: 'pointer',
                color: mode === item ? 'white' : 'var(--muted)',
                background: mode === item ? 'var(--accent)' : 'transparent',
                fontWeight: 600,
              }}
            >
              {item === 'login' ? 'Login' : 'Signup'}
            </button>
          ))}
        </div>

        {mode === 'signup' && (
          <label style={{ display: 'block', marginBottom: '12px' }}>
            <span style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
              style={inputStyle}
            />
          </label>
        )}

        <label style={{ display: 'block', marginBottom: '12px' }}>
          <span style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            style={inputStyle}
          />
        </label>

        <label style={{ display: 'block', marginBottom: '14px' }}>
          <span style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>Password</span>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              minLength={8}
              required
              style={{ ...inputStyle, paddingRight: '42px' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', display: 'flex' }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>

        {error && (
          <div style={{ color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.24)', borderRadius: '6px', padding: '9px 10px', fontSize: '13px', marginBottom: '14px' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            border: 'none',
            borderRadius: '8px',
            padding: '11px 14px',
            background: 'var(--accent)',
            color: 'white',
            cursor: loading ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontWeight: 700,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {mode === 'signup' ? <UserPlus size={16} /> : <LogIn size={16} />}
          {loading ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Log in'}
        </button>
      </form>
    </div>
  );
}

const inputStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid var(--border)',
  borderRadius: '7px',
  background: 'var(--bg)',
  color: 'var(--fg)',
  padding: '10px 12px',
  outline: 'none',
  fontSize: '14px',
};
