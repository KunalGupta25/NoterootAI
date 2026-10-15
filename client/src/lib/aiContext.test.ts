import { describe, it, expect } from 'vitest';
import {
  estimateTokens,
  htmlToCompactMarkdown,
  chunkNote,
  rankChunks,
  routeIntent,
  buildMessages,
  getModeParameters,
  CHAT_SYSTEM_PROMPT,
  EDIT_SYSTEM_PROMPT,
} from './aiContext';

describe('aiContext - token estimator', () => {
  it('returns 0 for empty or null text', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens(null)).toBe(0);
  });

  it('calculates ceil(chars / 4)', () => {
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('abcde')).toBe(2);
    expect(estimateTokens('12345678')).toBe(2);
  });
});

describe('aiContext - htmlToCompactMarkdown', () => {
  it('converts basic headings, paragraphs, and lists', () => {
    const html = '<h1>My Note</h1><p>Introduction paragraph.</p><ul><li>First item</li><li>Second item</li></ul>';
    const md = htmlToCompactMarkdown(html);
    expect(md).toContain('# My Note');
    expect(md).toContain('Introduction paragraph.');
    expect(md).toContain('- First item');
    expect(md).toContain('- Second item');
  });

  it('strips scripts, styles, and image tags', () => {
    const html = '<h1>Safe Title</h1><script>alert("hack")</script><style>.cls{}</style><img src="data:image/png;base64,12345" /><p>Safe content.</p>';
    const md = htmlToCompactMarkdown(html);
    expect(md).not.toContain('alert');
    expect(md).not.toContain('data:image');
    expect(md).toContain('# Safe Title');
    expect(md).toContain('Safe content.');
  });

  it('formats code blocks with language', () => {
    const html = '<pre><code class="language-typescript">const x: number = 42;</code></pre>';
    const md = htmlToCompactMarkdown(html);
    expect(md).toContain('```typescript');
    expect(md).toContain('const x: number = 42;');
    expect(md).toContain('```');
  });
});

describe('aiContext - chunkNote', () => {
  it('returns empty array for empty markdown', () => {
    expect(chunkNote('')).toEqual([]);
  });

  it('chunks content and attaches heading paths', () => {
    const md = `# Section One\n\nParagraph 1 describing section one in detail.\n\n## Subsection A\n\nDetailed points about subsection A.`;
    const chunks = chunkNote(md);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks[0].tokens).toBeGreaterThan(0);
  });
});

describe('aiContext - rankChunks', () => {
  it('ranks chunks with matching query terms higher', () => {
    const chunks = [
      {
        index: 0,
        headingPath: 'Authentication',
        text: 'OAuth2 and JWT token validation details.',
        tokens: 30,
      },
      {
        index: 1,
        headingPath: 'Database',
        text: 'PostgreSQL schema migrations and indexing.',
        tokens: 30,
      },
      {
        index: 2,
        headingPath: 'Deployment',
        text: 'Docker compose setup and Kubernetes manifests.',
        tokens: 30,
      },
    ];

    const ranked = rankChunks('How do JWT tokens work in auth?', chunks, 100);
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0].headingPath).toBe('Authentication');
  });

  it('respects maximum token budget', () => {
    const chunks = [
      { index: 0, headingPath: 'A', text: 'Text A', tokens: 100 },
      { index: 1, headingPath: 'B', text: 'Text B', tokens: 100 },
      { index: 2, headingPath: 'C', text: 'Text C', tokens: 100 },
    ];
    const ranked = rankChunks('Text', chunks, 150);
    const totalTokens = ranked.reduce((acc, c) => acc + c.tokens, 0);
    expect(totalTokens).toBeLessThanOrEqual(150);
  });
});

describe('aiContext - routeIntent', () => {
  it('routes general knowledge question to note: none, vault: false, web: false', () => {
    const route = routeIntent('What is the capital of France?', {
      hasSelection: false,
      mode: 'chat',
      webAvailable: true,
      noteTokens: 5000,
    });
    expect(route.note).toBe('none');
    expect(route.vault).toBe(false);
    expect(route.web).toBe(false);
  });

  it('routes deictic reference "summarize this note" to relevant note chunks', () => {
    const route = routeIntent('Can you summarize this note for me?', {
      hasSelection: false,
      mode: 'chat',
      webAvailable: false,
      noteTokens: 4000,
    });
    expect(route.note).toBe('relevant');
  });

  it('routes active selection in edit mode to selection', () => {
    const route = routeIntent('Fix grammar', {
      hasSelection: true,
      mode: 'edit',
    });
    expect(route.note).toBe('selection');
    expect(route.vault).toBe(false);
    expect(route.web).toBe(false);
  });

  it('routes vault search queries to vault: true', () => {
    const route = routeIntent('Did I write any notes about project roadmap?', {
      hasSelection: false,
      mode: 'chat',
      webAvailable: true,
    });
    expect(route.vault).toBe(true);
  });

  it('routes recency/news queries to web: true when web is available', () => {
    const route = routeIntent('What is the latest news today regarding AI?', {
      hasSelection: false,
      mode: 'chat',
      webAvailable: true,
    });
    expect(route.web).toBe(true);
  });

  it('keeps web: false if web is not available', () => {
    const route = routeIntent('What is the latest release version?', {
      hasSelection: false,
      mode: 'chat',
      webAvailable: false,
    });
    expect(route.web).toBe(false);
  });
});

describe('aiContext - buildMessages', () => {
  it('puts static system prompt at start and separates ephemeral context in chat mode', () => {
    const messages = buildMessages({
      mode: 'chat',
      question: 'What is the main topic?',
      context: {
        noteContent: [{ title: 'Doc 1', heading: 'Intro', text: 'This is the note content.' }],
        vaultResults: [{ title: 'Related Doc', id: 'doc-123', excerpt: 'Related snippet.' }],
        webResults: [{ n: 1, url: 'https://example.com', title: 'Example', snippet: 'Web snippet.' }],
      },
    });

    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toBe(CHAT_SYSTEM_PROMPT);

    const userMessage = messages[messages.length - 1];
    expect(userMessage.role).toBe('user');
    expect(userMessage.content).toContain('<context>');
    expect(userMessage.content).toContain('<note title="Doc 1" part="Intro">');
    expect(userMessage.content).toContain('<vault title="Related Doc" id="doc-123">');
    expect(userMessage.content).toContain('<web n="1" url="https://example.com" title="Example">');
    expect(userMessage.content).toContain('What is the main topic?');
  });

  it('strips previous <context> blocks from conversation history', () => {
    const history = [
      {
        role: 'user' as const,
        content: '<context><note>old note</note></context>Previous question',
      },
      {
        role: 'assistant' as const,
        content: 'Previous answer',
      },
    ];

    const messages = buildMessages({
      mode: 'chat',
      question: 'Follow-up question',
      history,
    });

    const prevUserMsg = messages.find(m => m.content.includes('Previous question'));
    expect(prevUserMsg).toBeDefined();
    expect(prevUserMsg?.content).not.toContain('<context>');
    expect(prevUserMsg?.content).toBe('Previous question');
  });

  it('formats edit mode messages with Instruction and Text block', () => {
    const messages = buildMessages({
      mode: 'edit',
      question: 'Make it more concise',
      selectedText: 'Here is some verbose text to edit.',
    });

    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toBe(EDIT_SYSTEM_PROMPT);

    const userMessage = messages[1];
    expect(userMessage.role).toBe('user');
    expect(userMessage.content).toContain('Instruction: Make it more concise');
    expect(userMessage.content).toContain('Text:\n"""\nHere is some verbose text to edit.\n"""');
  });
});

describe('aiContext - getModeParameters', () => {
  it('returns low temperature and calculated max_tokens for edit mode', () => {
    const params = getModeParameters('edit', 100);
    expect(params.temperature).toBe(0.2);
    expect(params.max_tokens).toBe(Math.min(2048, Math.round(1.3 * 100 + 100)));
  });

  it('returns balanced temperature and fixed max_tokens for chat mode', () => {
    const params = getModeParameters('chat', 500);
    expect(params.temperature).toBe(0.5);
    expect(params.max_tokens).toBe(1024);
  });
});
