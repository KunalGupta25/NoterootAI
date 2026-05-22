import { useEffect, useRef } from 'react';
import { usePluginStore } from '../../stores/pluginStore';

interface IframeSandboxProps {
  id: string;
  sourceCode: string;
}

const sandboxHtmlTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script>
    // Stub the PluginAPI which routes calls to the parent via postMessage
    const callCallbacks = {};
    let callIdCounter = 0;

    window.PluginAPI = {
      notes: {
        createNote: (title, content) => _rpc('notes', 'createNote', [title, content]),
        updateNote: (id, updates) => _rpc('notes', 'updateNote', [id, updates]),
        getNote: (id) => _rpc('notes', 'getNote', [id]),
        appendContent: (id, markdown) => _rpc('notes', 'appendContent', [id, markdown])
      },
      ui: {
        showToast: (msg, type) => _rpc('ui', 'showToast', [msg, type])
      }
    };

    function _rpc(namespace, method, args) {
      return new Promise((resolve, reject) => {
        const callId = String(++callIdCounter);
        callCallbacks[callId] = { resolve, reject };
        window.parent.postMessage({
          type: 'API_REQUEST',
          callId,
          namespace,
          method,
          args
        }, '*');
      });
    }

    window.addEventListener('message', (event) => {
      const data = event.data;
      if (data && data.type === 'API_RESPONSE') {
        const cb = callCallbacks[data.callId];
        if (cb) {
          if (data.error) cb.reject(new Error(data.error));
          else cb.resolve(data.result);
          delete callCallbacks[data.callId];
        }
      }
    });
  </script>
</head>
<body>
  <!-- Plugin UI container -->
  <div id="plugin-root"></div>
  <script>
    // Injected plugin code executes below
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'INIT_PLUGIN') {
        try {
          const fn = new Function('PluginAPI', event.data.code);
          fn(window.PluginAPI);
        } catch (err) {
          console.error("Plugin failed to load:", err);
        }
      }
    });
  </script>
</body>
</html>
`;

export default function IframeSandbox({ id, sourceCode }: IframeSandboxProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { handlePluginApiRequest } = usePluginStore();

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Ensure the message came from our iframe
      if (iframeRef.current && event.source === iframeRef.current.contentWindow) {
        const data = event.data;
        if (data && data.type === 'API_REQUEST') {
          try {
            const result = await handlePluginApiRequest(data.namespace, data.method, data.args);
            iframeRef.current.contentWindow?.postMessage({
              type: 'API_RESPONSE',
              callId: data.callId,
              result
            }, '*');
          } catch (err: any) {
            iframeRef.current.contentWindow?.postMessage({
              type: 'API_RESPONSE',
              callId: data.callId,
              error: err.message
            }, '*');
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handlePluginApiRequest]);

  useEffect(() => {
    // Send INIT message after a slight delay to let iframe load
    const timer = setTimeout(() => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage({
          type: 'INIT_PLUGIN',
          code: sourceCode
        }, '*');
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [sourceCode]);

  return (
    <iframe
      ref={iframeRef}
      title={`plugin-${id}`}
      sandbox="allow-scripts"
      srcDoc={sandboxHtmlTemplate}
      style={{ width: '100%', height: '100%', border: 'none' }}
    />
  );
}
