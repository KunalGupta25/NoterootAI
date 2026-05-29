import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEffect, useState, useRef, useCallback } from 'react';
import NoteEditor from '../components/Editor/NoteEditor';
import DatabaseView from '../components/Editor/DatabaseView';
import type { Note } from '../stores/noteStore';
import { useNoteStore } from '../stores/noteStore';
import { ChevronDown, ChevronRight, Plus, Trash2, X } from 'lucide-react';
import { NotePageActionsBar } from '../plugins/slots/NotePageActionsBar';

const PAGE_ICONS = ['📄','📝','📓','📕','📗','📘','📙','📔','🗂️','📁','📋','🗒️','🏷️','💡','⭐','🔥','🚀','🎯','🧠','🔬','🔧','💻','🎨','📊','📈','🌐','🏗️','⚙️'];

export default function NoteEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { saveNote, getNote, getChildren, notes } = useNoteStore();

  const [title, setTitle] = useState('Untitled');
  const [content, setContent] = useState('');
  const [icon, setIcon] = useState('📄');
  const [parentId, setParentId] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [properties, setProperties] = useState<Record<string, string>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showProperties, setShowProperties] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [addingTag, setAddingTag] = useState(false);

  const titleRef = useRef(title);
  const contentRef = useRef(content);
  const iconRef = useRef(icon);
  const tagsRef = useRef(tags);
  const propertiesRef = useRef(properties);
  const parentIdRef = useRef(parentId);
  const tagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { titleRef.current = title; }, [title]);
  useEffect(() => { contentRef.current = content; }, [content]);
  useEffect(() => { iconRef.current = icon; }, [icon]);
  useEffect(() => { tagsRef.current = tags; }, [tags]);
  useEffect(() => { propertiesRef.current = properties; }, [properties]);
  useEffect(() => { parentIdRef.current = parentId; }, [parentId]);

  useEffect(() => {
    setIsLoaded(false);
    if (id && id !== 'new') {
      getNote(id).then(note => {
        if (note) {
          setTitle(note.title);
          setContent(note.content);
          setIcon(note.icon || '📄');
          setParentId(note.parentId);
          setTags(note.tags || []);
          setProperties(note.properties || {});
          
          window.dispatchEvent(new CustomEvent('NOTEROOT_NOTE_OPENED', { detail: { noteId: id } }));
        }
        setIsLoaded(true);
      });
    } else {
      setTitle('Untitled'); setContent(''); setIcon('📄');
      setParentId(null); setTags([]); setProperties({});
      setIsLoaded(true);
    }
  }, [id, getNote]);

  // Scroll to heading if hash is present
  useEffect(() => {
    if (isLoaded && window.location.hash) {
      const headingText = decodeURIComponent(window.location.hash.slice(1));
      // Small delay to allow Tiptap to finish rendering DOM nodes
      setTimeout(() => {
        const editorEl = document.querySelector('.ProseMirror');
        if (editorEl) {
          const headings = Array.from(editorEl.querySelectorAll('h1, h2, h3, h4, h5, h6'));
          const target = headings.find(h => h.textContent === headingText) as HTMLElement;
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            const originalBg = target.style.backgroundColor;
            target.style.transition = 'background-color 0.5s ease';
            target.style.backgroundColor = 'var(--surface)';
            target.style.borderRadius = '4px';
            setTimeout(() => {
              target.style.backgroundColor = originalBg;
            }, 2000);
          }
        }
      }, 150);
    }
  }, [isLoaded, id]);

  useEffect(() => {
    if (addingTag && tagInputRef.current) tagInputRef.current.focus();
  }, [addingTag]);

  const triggerSave = useCallback(async (
    t?: string, c?: string, i?: string,
    tg?: string[], pr?: Record<string, string>
  ) => {
    if (!id || id === 'new') return;
    await saveNote({
      _id: id,
      title: t ?? titleRef.current,
      content: c ?? contentRef.current,
      icon: i ?? iconRef.current,
      parentId: parentIdRef.current,
      tags: tg ?? tagsRef.current,
      properties: pr ?? propertiesRef.current,
    });
  }, [id, saveNote]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setTitle(v); titleRef.current = v;
    triggerSave(v);
  };

  const handleContentChange = useCallback((c: string) => {
    setContent(c); contentRef.current = c;
    triggerSave(undefined, c);
  }, [triggerSave]);

  const handleIconChange = (newIcon: string) => {
    setIcon(newIcon); iconRef.current = newIcon;
    setShowIconPicker(false);
    triggerSave(undefined, undefined, newIcon);
  };

  // ── Tag handlers ──
  const normalizeTag = (t: string) =>
    t.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 20);

  const addTag = () => {
    const normalized = normalizeTag(tagInput);
    if (normalized && !tagsRef.current.includes(normalized)) {
      const newTags = [...tagsRef.current, normalized];
      setTags(newTags); tagsRef.current = newTags;
      triggerSave(undefined, undefined, undefined, newTags);
    }
    setTagInput('');
    setAddingTag(false);
  };

  const removeTag = (tag: string) => {
    const newTags = tagsRef.current.filter(t => t !== tag);
    setTags(newTags); tagsRef.current = newTags;
    triggerSave(undefined, undefined, undefined, newTags);
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); }
    else if (e.key === 'Escape') { setTagInput(''); setAddingTag(false); }
  };

  // ── Property handlers ──
  const addProperty = () => {
    const key = `Property ${Object.keys(propertiesRef.current).length + 1}`;
    const newProps = { ...propertiesRef.current, [key]: '' };
    setProperties(newProps); propertiesRef.current = newProps;
    setShowProperties(true);
    triggerSave(undefined, undefined, undefined, undefined, newProps);
  };

  const updatePropertyKey = (oldKey: string, newKey: string) => {
    if (!newKey.trim() || newKey === oldKey) return;
    const entries = Object.entries(propertiesRef.current);
    const newProps: Record<string, string> = {};
    entries.forEach(([k, v]) => { newProps[k === oldKey ? newKey.trim() : k] = v; });
    setProperties(newProps); propertiesRef.current = newProps;
    triggerSave(undefined, undefined, undefined, undefined, newProps);
  };

  const updatePropertyValue = (key: string, value: string) => {
    const newProps = { ...propertiesRef.current, [key]: value };
    setProperties(newProps); propertiesRef.current = newProps;
    triggerSave(undefined, undefined, undefined, undefined, newProps);
  };

  const removeProperty = (key: string) => {
    const newProps = { ...propertiesRef.current };
    delete newProps[key];
    setProperties(newProps); propertiesRef.current = newProps;
    triggerSave(undefined, undefined, undefined, undefined, newProps);
  };

  const handleAddSubPage = async () => {
    if (!id || id === 'new') return;
    const childId = await saveNote({ title: 'Untitled', parentId: id, icon: '📄' });
    navigate(`/notes/${childId}`);
  };

  const getBreadcrumbs = (): Note[] => {
    const crumbs: Note[] = [];
    let cur = parentId;
    while (cur) {
      const parent = notes.find(n => n._id === cur);
      if (parent) { crumbs.unshift(parent); cur = parent.parentId; } else break;
    }
    return crumbs;
  };

  if (!isLoaded) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)' }}>
      Loading...
    </div>
  );

  const breadcrumbs = getBreadcrumbs();
  const children = id && id !== 'new' ? getChildren(id) : [];
  const propertyEntries = Object.entries(properties);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>

      {/* ── Breadcrumbs ── */}
      {breadcrumbs.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--muted)', marginBottom: '16px', flexWrap: 'wrap' }}>
          {breadcrumbs.map((crumb) => (
            <span key={crumb._id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Link to={`/notes/${crumb._id}`}
                style={{ textDecoration: 'none', color: 'var(--muted)', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
              >{crumb.icon} {crumb.title}</Link>
              <span style={{ color: 'var(--border)' }}>/</span>
            </span>
          ))}
          <span style={{ color: 'var(--fg)', fontWeight: 500 }}>{icon} {title}</span>
        </div>
      )}

      {/* ── Note Header ── */}
      <div style={{ marginBottom: '32px', borderBottom: '1.5px solid var(--border)', paddingBottom: '20px' }}>

        {/* Icon + Title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button onClick={() => setShowIconPicker(!showIconPicker)}
              style={{ fontSize: '48px', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'transform 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              title="Change icon"
            >{icon}</button>
            {showIconPicker && (
              <div style={{ position: 'absolute', top: '60px', left: 0, background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '12px', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', zIndex: 100, boxShadow: '0 8px 30px rgba(0,0,0,0.12)', width: '260px' }}>
                {PAGE_ICONS.map(emoji => (
                  <button key={emoji} onClick={() => handleIconChange(emoji)}
                    style={{ fontSize: '20px', background: 'none', border: '1px solid transparent', borderRadius: '4px', cursor: 'pointer', padding: '4px', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'transparent'; }}
                  >{emoji}</button>
                ))}
              </div>
            )}
          </div>
          <div style={{ width: '100%' }}>
            <input type="text" value={title} onChange={handleTitleChange}
              style={{ fontFamily: 'var(--font-display)', fontSize: '42px', border: 'none', background: 'transparent', width: '100%', outline: 'none', color: 'var(--fg)', lineHeight: 1.1 }}
              placeholder="Untitled"
            />
            {id && id !== 'new' && <NotePageActionsBar noteId={id} />}
          </div>
        </div>

        {/* ── Tags row ── */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginTop: '14px' }}>
          {tags.map(tag => (
            <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px', padding: '2px 8px', fontSize: '12px', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
              #{tag}
              <button onClick={() => removeTag(tag)}
                style={{ background: 'none', border: 'none', padding: '0 0 0 2px', cursor: 'pointer', color: 'var(--muted)', display: 'flex', lineHeight: 1, transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
              ><X size={10} /></button>
            </span>
          ))}
          {addingTag ? (
            <input ref={tagInputRef} value={tagInput} onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown} onBlur={addTag}
              placeholder="tag-name..."
              style={{ fontSize: '12px', border: '1px solid var(--accent)', borderRadius: '4px', padding: '2px 8px', background: 'transparent', outline: 'none', width: '110px', fontFamily: 'var(--font-mono)', color: 'var(--fg)' }}
            />
          ) : (
            <button onClick={() => setAddingTag(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'none', border: '1px dashed var(--border)', borderRadius: '4px', padding: '2px 8px', fontSize: '12px', color: 'var(--muted)', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)'; }}
            ><Plus size={10} /> Add tag</button>
          )}
          <div style={{ flex: 1 }} />
          {id && id !== 'new' && (
            <button onClick={handleAddSubPage} style={{ fontSize: '12px', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              + Sub-page
            </button>
          )}
        </div>

        {/* ── Properties section ── */}
        <div style={{ marginTop: '12px' }}>
          <button onClick={() => setShowProperties(!showProperties)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', padding: '2px 0', fontSize: '12px', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font-mono)', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
          >
            {showProperties ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            ⚙ Properties{propertyEntries.length > 0 ? ` (${propertyEntries.length})` : ''}
          </button>

          {showProperties && (
            <div style={{ marginTop: '8px', padding: '12px', background: 'var(--bg)', borderRadius: '6px', border: '1px solid var(--border)' }}>
              {propertyEntries.length === 0 && (
                <div style={{ color: 'var(--muted)', fontSize: '12px', fontStyle: 'italic', marginBottom: '8px' }}>
                  No properties yet. Properties appear as columns in the database view.
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: propertyEntries.length > 0 ? '8px' : '0' }}>
                {propertyEntries.map(([key, value]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      defaultValue={key}
                      onBlur={e => updatePropertyKey(key, e.target.value)}
                      style={{ width: '130px', fontSize: '12px', fontFamily: 'var(--font-mono)', padding: '4px 8px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--surface)', color: 'var(--muted)', outline: 'none' }}
                    />
                    <span style={{ color: 'var(--border)', flexShrink: 0 }}>:</span>
                    <input
                      value={value}
                      onChange={e => updatePropertyValue(key, e.target.value)}
                      onBlur={() => triggerSave()}
                      placeholder="Value..."
                      style={{ flex: 1, fontSize: '12px', padding: '4px 8px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--surface)', color: 'var(--fg)', outline: 'none' }}
                    />
                    <button onClick={() => removeProperty(key)}
                      style={{ background: 'none', border: 'none', padding: '2px', color: 'var(--muted)', cursor: 'pointer', display: 'flex', transition: 'color 0.15s', flexShrink: 0 }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
                    ><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
              <button onClick={addProperty}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: '1px dashed var(--border)', borderRadius: '4px', padding: '5px 12px', fontSize: '12px', color: 'var(--muted)', cursor: 'pointer', width: '100%', justifyContent: 'center', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)'; }}
              ><Plus size={12} /> Add property</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Editor ── */}
      <div>
        <NoteEditor key={id} initialContent={content} onChange={handleContentChange} />
      </div>

      {/* ── Database View: child pages ── */}
      {id && id !== 'new' && children.length > 0 && (
        <DatabaseView parentId={id} parentTitle={title} />
      )}
    </div>
  );
}
