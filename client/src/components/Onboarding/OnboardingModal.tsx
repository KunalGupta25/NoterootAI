import { useState, useEffect } from 'react';
import {
  Sparkles, FileText, Network, Folder, ArrowRight,
  ArrowLeft, CheckCircle2, BookOpen
} from 'lucide-react';
import { useNoteStore } from '../../stores/noteStore';
import { useNavigate } from 'react-router-dom';

interface OnboardingModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export const TUTORIAL_NOTE_CONTENT = `
<h2>👋 Welcome to NoteRoot AI!</h2>
<p>NoteRoot AI is your personal knowledge base, second brain, and AI research partner. Here is a quick cheatsheet to get the most out of your workspace.</p>

<div class="callout-box">
  <p style="margin:0;">💡 <strong>Quick Start Cheatsheet</strong><br/>
  Press <kbd>Ctrl + K</kbd> to open the search command palette anywhere.<br/>
  Type <code>/</code> inside any note to summon formatting commands.<br/>
  Type <code>[[</code> to link another note in your vault.</p>
</div>

<h3>1. Writing & Formatting</h3>
<p>Our editor supports full Markdown and rich blocks:</p>
<ul>
  <li><strong>Headings:</strong> Type <code>#</code>, <code>##</code>, or <code>###</code> followed by Space.</li>
  <li><strong>Checklists:</strong> Type <code>[]</code> followed by Space to create actionable tasks.</li>
  <li><strong>Quotes & Callouts:</strong> Use <code>/quote</code> or <code>/callout</code>.</li>
  <li><strong>Math Equations:</strong> Type <code>$$</code> for LaTeX formulas.</li>
</ul>

<h3>2. AI Assistant & Knowledge Chat</h3>
<p>Click the <strong>AI Assistant</strong> button in the top right of this editor or visit <strong>AI Chat</strong> in the sidebar. You can ask questions about your documents, ask AI to refine your writing, fix grammar, or summarize sections.</p>

<h3>3. Knowledge Graph</h3>
<p>Every note you connect with <code>[[Wiki-links]]</code> or group by tag automatically populates the <strong>Knowledge Graph</strong> view in the sidebar. Switch to Graph View anytime to visualize your ideas.</p>
`;

export default function OnboardingModal({ forceOpen = false, onClose }: OnboardingModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const { saveNote } = useNoteStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      return;
    }
    const neverShow = localStorage.getItem('noteroot_onboarding_never_show');
    const hasSeen = localStorage.getItem('noteroot_onboarding_completed');
    if (!neverShow && !hasSeen) {
      setIsOpen(true);
    }
  }, [forceOpen]);

  const handleComplete = (shouldCreateNote = false) => {
    localStorage.setItem('noteroot_onboarding_completed', 'true');
    if (dontShowAgain) {
      localStorage.setItem('noteroot_onboarding_never_show', 'true');
    }
    setIsOpen(false);
    if (onClose) onClose();

    if (shouldCreateNote) {
      saveNote({
        title: 'Welcome & Tutorial Guide',
        content: TUTORIAL_NOTE_CONTENT,
        icon: '📚',
        parentId: null,
        tags: ['Tutorial', 'Getting Started'],
      }).then(id => {
        navigate(`/notes/${id}`);
      });
    }
  };

  const handleSkip = () => {
    handleComplete(false);
  };

  if (!isOpen) return null;

  const steps = [
    {
      icon: (
        <div style={{ width: 44, height: 44, borderRadius: '10px', background: 'rgba(224, 84, 56, 0.12)', color: '#e05438', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={24} />
        </div>
      ),
      badge: 'Getting Started',
      title: 'Welcome to NoteRoot AI',
      subtitle: 'Your personal second brain with connected notes, AI intelligence, and visual knowledge graphs.',
      body: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: 'var(--surface-2)', padding: '12px 14px', borderRadius: '8px' }}>
            <span style={{ fontSize: '18px' }}>⚡</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--fg)' }}>Local-First & Blazing Fast</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Your notes are saved instantly and sync seamlessly with cloud storage.</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: 'var(--surface-2)', padding: '12px 14px', borderRadius: '8px' }}>
            <span style={{ fontSize: '18px' }}>🧠</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--fg)' }}>Built-in AI Assistant</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Chat with your knowledge base, rewrite sections, and synthesize ideas.</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: 'var(--surface-2)', padding: '12px 14px', borderRadius: '8px' }}>
            <span style={{ fontSize: '18px' }}>🕸️</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--fg)' }}>Readable Knowledge Graph</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Explore visual connections between notes and concepts in 2D space.</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: (
        <div style={{ width: 44, height: 44, borderRadius: '10px', background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FileText size={24} />
        </div>
      ),
      badge: 'Editor',
      title: 'Rich Editor & Slash Commands',
      subtitle: 'Write cleanly without distractions while retaining powerful Markdown superpowers.',
      body: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
          <div style={{ background: 'var(--surface-2)', padding: '14px', borderRadius: '8px', borderLeft: '3px solid #3b82f6' }}>
            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--fg)', marginBottom: '4px' }}>Type <code>/</code> for quick actions</div>
            <div style={{ fontSize: '12.5px', color: 'var(--muted)' }}>
              Summon headings, bullet lists, callouts, tables, code blocks, or LaTeX math equations on the fly.
            </div>
          </div>
          <div style={{ background: 'var(--surface-2)', padding: '14px', borderRadius: '8px', borderLeft: '3px solid #e05438' }}>
            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--fg)', marginBottom: '4px' }}>Type <code>[[</code> to link notes</div>
            <div style={{ fontSize: '12.5px', color: 'var(--muted)' }}>
              Link directly to other notes in your vault. Connections automatically appear on your Knowledge Graph!
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: (
        <div style={{ width: 44, height: 44, borderRadius: '10px', background: 'rgba(234, 179, 8, 0.12)', color: '#eab308', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={24} />
        </div>
      ),
      badge: 'AI Intelligence',
      title: 'Chat with Your Knowledge (RAG)',
      subtitle: 'Get answers and citations directly from your own notes and documents.',
      body: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
          <div style={{ fontSize: '13px', color: 'var(--fg)', lineHeight: 1.6 }}>
            In the <strong>AI Chat</strong> page or the side panel of any note:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: '6px', fontSize: '12.5px', color: 'var(--fg)' }}>
              🔍 Ask: <em>"What were the key takeaways from my meetings last week?"</em>
            </div>
            <div style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: '6px', fontSize: '12.5px', color: 'var(--fg)' }}>
              ✨ Ask: <em>"Summarize this project proposal and suggest improvements."</em>
            </div>
            <div style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: '6px', fontSize: '12.5px', color: 'var(--fg)' }}>
              ⚡ Action: Fix grammar, change tone, or translate content instantly.
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: (
        <div style={{ width: 44, height: 44, borderRadius: '10px', background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Network size={24} />
        </div>
      ),
      badge: 'Graph View',
      title: 'Clear, Human-Readable Graph',
      subtitle: 'Visualize your vault with spacious node layouts and clear relationships.',
      body: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
          <div style={{ fontSize: '13px', color: 'var(--fg)', lineHeight: 1.6 }}>
            The upgraded Knowledge Graph prevents overlapping labels:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--fg-2)' }}>
              <CheckCircle2 size={16} color="#22c55e" />
              <span><strong>Spacious force physics:</strong> Generous node repulsion stops nodes from clustering.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--fg-2)' }}>
              <CheckCircle2 size={16} color="#22c55e" />
              <span><strong>Legible labels:</strong> Contrast text halos make every node title clearly readable.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--fg-2)' }}>
              <CheckCircle2 size={16} color="#22c55e" />
              <span><strong>Interactive filters:</strong> Filter by spaces, tags, or search specific nodes.</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: (
        <div style={{ width: 44, height: 44, borderRadius: '10px', background: 'rgba(168, 85, 247, 0.12)', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Folder size={24} />
        </div>
      ),
      badge: 'Organization',
      title: 'Spaces, Tags & Plugins',
      subtitle: 'Keep your personal, college, project, and work notes neatly categorized.',
      body: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
          <div style={{ fontSize: '13px', color: 'var(--fg)', lineHeight: 1.6 }}>
            Use the left sidebar to navigate spaces or install community extensions like PDF Reader and Web Clipper.
          </div>
          <div style={{ padding: '14px', background: 'rgba(224, 84, 56, 0.08)', borderRadius: '8px', border: '1px solid rgba(224, 84, 56, 0.2)' }}>
            <div style={{ fontWeight: 600, fontSize: '13px', color: '#e05438', marginBottom: '4px' }}>
              Want a guided walkthrough inside your editor?
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '10px' }}>
              We can automatically generate a "Welcome & Tutorial Guide" page in your vault right now.
            </div>
            <button
              onClick={() => handleComplete(true)}
              style={{
                background: '#e05438',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '12.5px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <BookOpen size={14} /> Create Tutorial Guide & Finish
            </button>
          </div>
        </div>
      ),
    },
  ];

  const step = steps[currentStep];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fade-in 0.2s ease',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* Header with Step indicator */}
        <div
          style={{
            padding: '24px 28px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {step.icon}
            <div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#e05438',
                }}
              >
                {step.badge} • Step {currentStep + 1} of {steps.length}
              </span>
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  margin: '2px 0 0',
                  color: 'var(--fg)',
                }}
              >
                {step.title}
              </h2>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 28px 24px', flex: 1, minHeight: '220px' }}>
          <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
            {step.subtitle}
          </p>
          {step.body}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 28px',
            background: 'var(--surface-2)',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Don't show again checkbox */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontSize: '12px',
              color: 'var(--muted)',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={e => setDontShowAgain(e.target.checked)}
              style={{
                width: '14px',
                height: '14px',
                accentColor: '#e05438',
                cursor: 'pointer',
              }}
            />
            Don't show this again
          </label>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Left / Back button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(prev => prev - 1)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--fg)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <ArrowLeft size={13} /> Back
              </button>
            )}

            {/* Step Dots */}
            <div style={{ display: 'flex', gap: '5px', marginLeft: currentStep === 0 ? '0' : '8px' }}>
              {steps.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  style={{
                    width: currentStep === i ? '18px' : '6px',
                    height: '6px',
                    borderRadius: '3px',
                    background: currentStep === i ? '#e05438' : 'var(--border)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Right Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Prominent Skip Button at Bottom Right */}
            <button
              onClick={handleSkip}
              title="Skip tutorial and explore"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--muted)',
                fontSize: '12.5px',
                cursor: 'pointer',
                padding: '6px 10px',
                borderRadius: '6px',
                transition: 'color 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--fg)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
            >
              Skip Tutorial
            </button>

            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStep(prev => prev + 1)}
                style={{
                  background: '#e05438',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '7px 16px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 3px rgba(224, 84, 56, 0.3)',
                }}
              >
                Next <ArrowRight size={13} />
              </button>
            ) : (
              <button
                onClick={() => handleComplete(false)}
                style={{
                  background: '#22c55e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '7px 16px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                Get Started <ArrowRight size={13} />
              </button>
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
