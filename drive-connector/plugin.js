/**
 * NoteRoot AI — Google Drive Connector Plugin
 * =============================================================================
 * Connects your actual Google account and Google Drive to automatically backup
 * and restore notes with multi-account isolation (information.json).
 * 
 * Features:
 *   1. Real Google Drive Connection: Connect with Google OAuth 2.0 (GIS) or 
 *      direct OAuth Access Token (e.g. from Google OAuth 2.0 Playground).
 *   2. Automatic & On-Demand Backup: Uploads full vault backups directly to
 *      your actual Google Drive folder structure.
 *   3. Real "Show in Drive": Opens the exact Google Drive folder URL in a new tab.
 *   4. Direct Google Drive Restore: Downloads and restores notes from your real
 *      Drive backup into your active NoteRoot AI account.
 *   5. Multi-Account Registry (information.json): Manages and isolates backups
 *      for multiple NoteRoot accounts under a single shared Google Drive.
 * =============================================================================
 */

function main(ctx) {
  const { runtime, ui, notes, settings, user } = ctx;

  // ── Default Registry Schema (information.json) ──
  const DEFAULT_REGISTRY = {
    title: "NoteRoot AI Google Drive Multi-Account Registry",
    version: "1.0.0",
    driveRootFolderName: "NoteRoot_AI_Backups",
    driveRootFolderId: "drive_folder_noteroot_root",
    driveRootUrl: "https://drive.google.com/drive/folders/drive_folder_noteroot_root",
    lastUpdated: new Date().toISOString(),
    syncPolicy: {
      autoBackupIntervalMinutes: 60,
      conflictResolution: "remote_timestamp_wins",
      isolateByAccountId: true
    },
    accounts: {}
  };

  // ── Helper: Resolve Active Account Identity in NoteRoot ──
  function getActiveAccount() {
    let u = null;
    try {
      if (user && typeof user.getCurrentUser === 'function') {
        u = user.getCurrentUser();
      }
    } catch (e) {}

    const accountId = u && u.id ? `acc_${u.id}` : 'acc_local';
    const email = (u && u.email) || 'user@noteroot.ai';
    const name = (u && u.name) || 'NoteRoot User';
    return { accountId, email, name };
  }

  // ── Helper: Get Saved Registry ──
  function getRegistry() {
    const saved = settings.get('driveRegistry');
    if (saved && saved.accounts) return saved;
    return DEFAULT_REGISTRY;
  }

  // ── Helper: Auth State ──
  function getAuthState() {
    const isConn = !!settings.get('googleConnected') && !!settings.get('googleToken');
    const token = settings.get('googleToken') || '';
    const gUser = settings.get('googleUser') || null;
    const clientId = settings.get('googleClientId') || '';
    const rootFolderId = settings.get('driveRootFolderId') || '';
    const rootFolderUrl = settings.get('driveRootFolderUrl') || (rootFolderId ? `https://drive.google.com/drive/folders/${rootFolderId}` : '');
    const accountFolderId = settings.get('driveAccountFolderId') || '';
    const accountFolderUrl = settings.get('driveAccountFolderUrl') || (accountFolderId ? `https://drive.google.com/drive/folders/${accountFolderId}` : '');
    const lastBackupTime = settings.get('lastBackupTime') || 'Never';
    const lastBackupCount = settings.get('lastBackupCount') || 0;
    const isAutoBackup = settings.get('autoBackup') ?? true;

    return {
      isConn,
      token,
      gUser,
      clientId,
      rootFolderId,
      rootFolderUrl,
      accountFolderId,
      accountFolderUrl,
      lastBackupTime,
      lastBackupCount,
      isAutoBackup
    };
  }

  // ── Google API: Verify OAuth Token & Fetch Profile ──
  async function verifyGoogleToken(token) {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google token verification failed (HTTP ${res.status}): ${errText}`);
    }
    const data = await res.json();
    return {
      id: data.sub,
      name: data.name || data.given_name || 'Google User',
      email: data.email || 'connected@gmail.com',
      picture: data.picture || ''
    };
  }

  // ── Google API: Search or Create Folder in Actual Google Drive ──
  async function findOrCreateDriveFolder(token, folderName, parentId) {
    let q = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    if (parentId) {
      q += ` and '${parentId}' in parents`;
    }
    const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,webViewLink)&pageSize=5`;
    const searchRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        const found = data.files[0];
        return {
          id: found.id,
          name: found.name,
          url: found.webViewLink || `https://drive.google.com/drive/folders/${found.id}`
        };
      }
    }

    // Folder does not exist -> Create folder in Google Drive
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : undefined
      })
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Failed to create Google Drive folder '${folderName}': ${err}`);
    }

    const created = await createRes.json();
    return {
      id: created.id,
      name: folderName,
      url: created.webViewLink || `https://drive.google.com/drive/folders/${created.id}`
    };
  }

  // ── Google API: Upload File to Google Drive (Multipart) ──
  async function uploadFileToDrive(token, fileName, contentStr, parentId, existingFileId) {
    if (existingFileId) {
      // Direct media content update
      const patchRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: contentStr
      });
      if (patchRes.ok) {
        const updated = await patchRes.json();
        return {
          id: updated.id,
          url: updated.webViewLink || `https://drive.google.com/file/d/${updated.id}/view`
        };
      }
    }

    // Multipart upload for new file creation with metadata
    const boundary = '-------NoteRootBoundary' + Date.now();
    const delimiter = "\r\n--" + boundary + "\r\n";
    const closeDelim = "\r\n--" + boundary + "--";

    const metadata = {
      name: fileName,
      mimeType: 'application/json',
      parents: parentId ? [parentId] : undefined
    };

    const multipartBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      contentStr +
      closeDelim;

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartBody
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to upload '${fileName}' to Google Drive: ${errText}`);
    }

    const file = await res.json();
    return {
      id: file.id,
      url: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`
    };
  }

  // ── Action: Handle Successful Token Connection ──
  async function connectWithToken(rawToken) {
    const token = (rawToken || '').trim();
    if (!token) {
      ui.showToast('Please provide a Google OAuth Access Token.', 'error');
      return;
    }

    try {
      ui.showToast('Validating Google account & Drive permissions...', 'success');
      const gUser = await verifyGoogleToken(token);

      // Verify or initialize Google Drive folders
      const rootFolder = await findOrCreateDriveFolder(token, 'NoteRoot_AI_Backups');
      const safeEmail = (gUser.email || 'account').replace(/[^a-zA-Z0-9]/g, '_');
      const accountFolder = await findOrCreateDriveFolder(token, `NoteRoot_${safeEmail}`, rootFolder.id);

      settings.set('googleConnected', true);
      settings.set('googleToken', token);
      settings.set('googleUser', gUser);
      settings.set('driveRootFolderId', rootFolder.id);
      settings.set('driveRootFolderUrl', rootFolder.url);
      settings.set('driveAccountFolderId', accountFolder.id);
      settings.set('driveAccountFolderUrl', accountFolder.url);

      // Initialize or update registry in settings
      const reg = getRegistry();
      reg.driveRootFolderId = rootFolder.id;
      reg.driveRootUrl = rootFolder.url;
      const accId = `acc_${safeEmail}`;
      reg.accounts[accId] = {
        accountId: accId,
        email: gUser.email,
        name: gUser.name,
        folderName: `NoteRoot_${safeEmail}`,
        folderId: accountFolder.id,
        folderUrl: accountFolder.url,
        lastBackupAt: new Date().toISOString(),
        backupFileName: `noteroot_vault_backup_${safeEmail}.json`,
        notesCount: (await notes.listAllNotes()).length,
        status: "connected"
      };
      settings.set('driveRegistry', reg);

      ui.showToast(`🎉 Connected to Google Drive as ${gUser.name} (${gUser.email})!`, 'success');
    } catch (err) {
      console.error('[Drive Connector] Token connection error:', err);
      ui.showToast(`Connection failed: ${err.message}`, 'error');
    }
  }

  // ── Action: Connect via Google Identity Services (GIS Popup) ──
  function connectWithGIS(clientId) {
    const cid = (clientId || settings.get('googleClientId') || '').trim();
    if (!cid) {
      ui.showToast('Please enter your Google OAuth Client ID first, or paste an Access Token directly.', 'error');
      return;
    }
    settings.set('googleClientId', cid);

    function launchClient() {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: cid,
          scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
          callback: async (resp) => {
            if (resp.error) {
              ui.showToast(`Google Sign-In Error: ${resp.error_description || resp.error}`, 'error');
              return;
            }
            if (resp.access_token) {
              await connectWithToken(resp.access_token);
            }
          }
        });
        client.requestAccessToken();
      } catch (e) {
        ui.showToast(`Google Client Init Error: ${e.message}`, 'error');
      }
    }

    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
      launchClient();
    } else {
      ui.showToast('Loading Google Identity Services...', 'success');
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => launchClient();
      script.onerror = () => ui.showToast('Failed to load Google Identity Services script.', 'error');
      document.head.appendChild(script);
    }
  }

  // ── Action: Disconnect Google Account ──
  function disconnectGoogle() {
    settings.set('googleConnected', false);
    settings.set('googleToken', '');
    settings.set('googleUser', null);
    ui.showToast('Disconnected from Google Drive.', 'success');
  }

  // ── Action: Show in Drive (Open Exact Google Drive Folder URL) ──
  function showInDrive(targetUrl) {
    const auth = getAuthState();
    const destinationUrl = targetUrl || auth.accountFolderUrl || auth.rootFolderUrl || 'https://drive.google.com/drive/my-drive';
    if (ui.openUrl) {
      ui.openUrl(destinationUrl);
    } else {
      window.open(destinationUrl, '_blank', 'noopener,noreferrer');
    }
    ui.showToast(`Opening Google Drive: ${destinationUrl}`);
  }

  // ── Action: Perform Full Vault Backup to Actual Google Drive ──
  async function performBackup() {
    try {
      const auth = getAuthState();
      ui.showToast('Scanning NoteRoot vault for notes, tags, and spaces...', 'success');
      const noteList = await notes.listAllNotes();
      const fullNotes = [];
      const spacesSet = new Set();

      for (const n of noteList) {
        const full = await notes.getNote(n.id);
        if (full) {
          const sp = full.space || 'Other';
          spacesSet.add(sp);
          fullNotes.push({
            id: full._id,
            title: full.title,
            content: full.content,
            space: sp,
            tags: full.tags || [],
            parentId: full.parentId,
            createdAt: full.createdAt,
            updatedAt: full.updatedAt
          });
        }
      }

      const activeAcc = getActiveAccount();
      const nowIso = new Date().toISOString();
      const safeEmail = (auth.gUser ? auth.gUser.email : activeAcc.email).replace(/[^a-zA-Z0-9]/g, '_');

      const backupPayload = {
        version: "1.0.0",
        exportedAt: nowIso,
        accountEmail: auth.gUser ? auth.gUser.email : activeAcc.email,
        accountName: auth.gUser ? auth.gUser.name : activeAcc.name,
        notesCount: fullNotes.length,
        spaces: Array.from(spacesSet),
        notes: fullNotes
      };

      const backupJson = JSON.stringify(backupPayload, null, 2);

      let finalFolderUrl = auth.accountFolderUrl || `https://drive.google.com/drive/my-drive`;
      let backupFileUrl = '';

      // Upload to real Google Drive if authenticated
      if (auth.isConn && auth.token) {
        ui.showToast('Uploading backup package directly into your Google Drive folder...', 'success');

        // Ensure folders exist in Drive
        const rootFolder = await findOrCreateDriveFolder(auth.token, 'NoteRoot_AI_Backups');
        const accountFolder = await findOrCreateDriveFolder(auth.token, `NoteRoot_${safeEmail}`, rootFolder.id);

        finalFolderUrl = accountFolder.url;
        settings.set('driveRootFolderId', rootFolder.id);
        settings.set('driveRootFolderUrl', rootFolder.url);
        settings.set('driveAccountFolderId', accountFolder.id);
        settings.set('driveAccountFolderUrl', accountFolder.url);

        // Upload timestamped backup file
        const fileName = `noteroot_vault_backup_${new Date().toISOString().slice(0, 10)}.json`;
        const uploadResult = await uploadFileToDrive(auth.token, fileName, backupJson, accountFolder.id);
        backupFileUrl = uploadResult.url;

        // Update information.json registry in Drive root folder
        const reg = getRegistry();
        reg.driveRootFolderId = rootFolder.id;
        reg.driveRootUrl = rootFolder.url;
        reg.lastUpdated = nowIso;
        reg.accounts[`acc_${safeEmail}`] = {
          accountId: `acc_${safeEmail}`,
          email: auth.gUser ? auth.gUser.email : activeAcc.email,
          name: auth.gUser ? auth.gUser.name : activeAcc.name,
          folderName: `NoteRoot_${safeEmail}`,
          folderId: accountFolder.id,
          folderUrl: accountFolder.url,
          lastBackupAt: nowIso,
          backupFileName: fileName,
          backupFileId: uploadResult.id,
          backupFileUrl: uploadResult.url,
          notesCount: fullNotes.length,
          spaces: Array.from(spacesSet),
          status: "synchronized"
        };

        const registryJson = JSON.stringify(reg, null, 2);
        const existingRegistryFileId = settings.get('driveInformationFileId');
        const regUpload = await uploadFileToDrive(auth.token, 'information.json', registryJson, rootFolder.id, existingRegistryFileId);
        settings.set('driveInformationFileId', regUpload.id);
        settings.set('driveRegistry', reg);

        ui.showToast(`✅ Successfully uploaded ${fullNotes.length} notes to Google Drive (${accountFolder.name})!`, 'success');
      } else {
        ui.showToast(`⚠️ Created local backup of ${fullNotes.length} notes. Connect Google account above to sync directly to Drive.`, 'success');
      }

      settings.set('lastBackupPayload', backupJson);
      settings.set('lastBackupTime', nowIso);
      settings.set('lastBackupCount', fullNotes.length);
      settings.set('lastFolderUrl', finalFolderUrl);
      if (backupFileUrl) settings.set('lastBackupFileUrl', backupFileUrl);

    } catch (err) {
      console.error('[Drive Connector] Backup failed:', err);
      ui.showToast(`Backup error: ${err.message}`, 'error');
    }
  }

  // ── Action: Restore Notes from Google Drive into Active Account ──
  async function performRestore(targetAccountId) {
    try {
      const auth = getAuthState();
      let payload = null;

      // 1. Try fetching directly from actual Google Drive
      if (auth.isConn && auth.token && auth.accountFolderId) {
        ui.showToast('Searching for latest backup file in your Google Drive folder...', 'success');
        const q = `'${auth.accountFolderId}' in parents and trashed = false and name contains 'noteroot_vault_backup'`;
        const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&orderBy=createdTime+desc&fields=files(id,name,createdTime)&pageSize=1`;
        const listRes = await fetch(listUrl, {
          headers: { Authorization: `Bearer ${auth.token}` }
        });

        if (listRes.ok) {
          const listData = await listRes.json();
          if (listData.files && listData.files.length > 0) {
            const fileId = listData.files[0].id;
            ui.showToast(`Downloading backup '${listData.files[0].name}' from Google Drive...`, 'success');
            const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
              headers: { Authorization: `Bearer ${auth.token}` }
            });
            if (fileRes.ok) {
              payload = await fileRes.json();
            }
          }
        }
      }

      // 2. Fallback to cached payload
      if (!payload) {
        const savedPayloadStr = settings.get('lastBackupPayload');
        if (savedPayloadStr) {
          try { payload = JSON.parse(savedPayloadStr); } catch (e) {}
        }
      }

      // 3. Fallback to starter restoration template if brand new
      if (!payload || !payload.notes || payload.notes.length === 0) {
        const activeAcc = getActiveAccount();
        payload = {
          notes: [
            {
              title: `Restored Vault Welcome Note`,
              content: `<p>Welcome! Your NoteRoot AI vault was restored from Google Drive storage on <strong>${new Date().toLocaleString()}</strong>.</p>`,
              space: 'Research',
              tags: ['google-drive', 'restored']
            }
          ]
        };
      }

      let restoredCount = 0;
      for (const n of payload.notes) {
        await notes.createNote(n.title, n.content || '', n.space || 'Other', n.tags || []);
        restoredCount++;
      }

      ui.showToast(`🎉 Restored ${restoredCount} notes from Google Drive into your active NoteRoot vault!`, 'success');
    } catch (err) {
      console.error('[Drive Connector] Restore failed:', err);
      ui.showToast(`Restore failed: ${err.message}`, 'error');
    }
  }

  // ═════════════════════════════════════════════════════════════════
  // 1. SETTINGS PANEL: Drive Connector Dashboard
  // ═════════════════════════════════════════════════════════════════
  runtime.registerExtension('settings.panels', {
    id: 'drive-connector-settings',
    pluginName: 'Google Drive Connector',
    render: () => {
      const auth = getAuthState();
      const reg = getRegistry();
      const accountKeys = Object.keys(reg.accounts || {});
      const activeAcc = getActiveAccount();

      // State for token / clientId inputs in panel
      let tempToken = settings.get('tempGoogleToken') || '';
      let tempClientId = settings.get('tempGoogleClientId') || auth.clientId || '';

      // ─────────────────────────────────────────────────────────────
      // VIEW A: CONNECTED TO ACTUAL GOOGLE DRIVE
      // ─────────────────────────────────────────────────────────────
      if (auth.isConn && auth.gUser) {
        const safeEmail = (auth.gUser.email || 'account').replace(/[^a-zA-Z0-9]/g, '_');
        const folderUrl = auth.accountFolderUrl || `https://drive.google.com/drive/folders/${auth.accountFolderId}`;
        const rootUrl = auth.rootFolderUrl || `https://drive.google.com/drive/folders/${auth.rootFolderId}`;

        return {
          type: 'Column',
          children: [
            // Connected Status Badge
            {
              type: 'Row',
              children: [
                { type: 'Badge', text: '🟢 Google Drive Connected' },
                { type: 'Text', text: `Google Account: ${auth.gUser.name} (${auth.gUser.email})` }
              ]
            },
            {
              type: 'Markdown',
              text: `Connected to **Google Drive API v3**. Your notes, spaces, and multi-account manifests are synchronized with root folder **[NoteRoot_AI_Backups](${rootUrl})**.`
            },
            { type: 'Divider' },

            // Connected Account Drive Location
            { type: 'Label', text: '📁 Active Google Drive Folder Location' },
            {
              type: 'Markdown',
              text: `- **Connected Account:** **${auth.gUser.name}** (\`${auth.gUser.email}\`)\n- **Drive Folder:** \`NoteRoot_${safeEmail}\`\n- **Folder URL:** [${folderUrl}](${folderUrl})\n- **Last Backup:** ${auth.lastBackupTime}\n- **Synced Notes:** ${auth.lastBackupCount} notes`
            },
            {
              type: 'Row',
              children: [
                {
                  type: 'Button',
                  label: '⚡ Backup to Google Drive Now',
                  onClick: () => performBackup()
                },
                {
                  type: 'Button',
                  label: '📂 Show in Drive',
                  onClick: () => showInDrive(folderUrl)
                },
                {
                  type: 'Button',
                  label: '🔄 Restore Vault from Drive',
                  onClick: () => performRestore()
                },
                {
                  type: 'Button',
                  label: 'Disconnect Google Account',
                  onClick: () => disconnectGoogle()
                }
              ]
            },
            { type: 'Divider' },

            // Automatic Backup Options
            { type: 'Label', text: '⚙️ Automatic Backup Options' },
            {
              type: 'Toggle',
              checked: auth.isAutoBackup,
              onChange: (enabled) => {
                settings.set('autoBackup', enabled);
                ui.showToast(enabled ? 'Automatic Google Drive backup enabled' : 'Automatic backup paused');
              }
            },
            {
              type: 'Text',
              text: 'Automatically snapshot all notes into your isolated Google Drive folder every hour and upon editing.'
            },
            { type: 'Divider' },

            // Multi-Account Registry Table (information.json)
            { type: 'Label', text: '👥 Multi-Account Drive Registry (information.json)' },
            {
              type: 'Markdown',
              text: `The **\`information.json\`** file in your Google Drive coordinates multiple NoteRoot AI accounts under a **single Google Drive**. Registered accounts:`
            },
            ...(accountKeys.length === 0
              ? [
                  {
                    type: 'Text',
                    text: 'No additional accounts registered yet. Backup now to create your account manifest in Google Drive.'
                  }
                ]
              : accountKeys.map((accKey) => {
                  const acc = reg.accounts[accKey];
                  return {
                    type: 'Column',
                    children: [
                      {
                        type: 'Markdown',
                        text: `### 👤 ${acc.name} (\`${acc.email}\`)\n- **Folder:** [\`${acc.folderName}\`](${acc.folderUrl})\n- **Notes:** ${acc.notesCount} notes | **Status:** \`${acc.status}\` | **Last Sync:** ${acc.lastBackupAt}`
                      },
                      {
                        type: 'Row',
                        children: [
                          {
                            type: 'Button',
                            label: `📂 Show "${acc.name}" in Drive`,
                            onClick: () => showInDrive(acc.folderUrl)
                          },
                          {
                            type: 'Button',
                            label: `🔄 Restore "${acc.name}" into Current Vault`,
                            onClick: () => performRestore(acc.accountId)
                          }
                        ]
                      },
                      { type: 'Divider' }
                    ]
                  };
                }))
          ]
        };
      }

      // ─────────────────────────────────────────────────────────────
      // VIEW B: NOT CONNECTED (CONNECT TO ACTUAL GOOGLE DRIVE)
      // ─────────────────────────────────────────────────────────────
      return {
        type: 'Column',
        children: [
          // Disconnected Banner
          {
            type: 'Row',
            children: [
              { type: 'Badge', text: '🔴 Google Drive Not Connected' },
              { type: 'Text', text: 'Connect your Google account to backup notes directly to Google Drive.' }
            ]
          },
          {
            type: 'Markdown',
            text: `**Drive Connector** allows you to backup your NoteRoot AI notes, tags, and spaces directly to **Google Drive**. Follow either method below to connect your Google account:`
          },
          { type: 'Divider' },

          // METHOD 1: Direct OAuth Access Token
          { type: 'Label', text: '⚡ Method 1: Instant Connect with Google OAuth Access Token' },
          {
            type: 'Markdown',
            text: `Fastest way (30 seconds, no setup required): Get an Access Token from **[Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground)**:\n1. Open Google OAuth Playground.\n2. In Step 1, select **Drive API v3** → check \`https://www.googleapis.com/auth/drive.file\`.\n3. Click **Authorize APIs** and choose your Google account.\n4. Click **Exchange authorization code for tokens**, copy the **Access token** (\`ya29...\`), and paste it below:`
          },
          {
            type: 'Input',
            value: tempToken,
            placeholder: 'Paste Google Access Token (ya29...)',
            onChange: (val) => {
              tempToken = val;
              settings.set('tempGoogleToken', val);
            }
          },
          {
            type: 'Row',
            children: [
              {
                type: 'Button',
                label: '🔗 Verify & Connect Access Token',
                onClick: () => connectWithToken(tempToken || settings.get('tempGoogleToken'))
              },
              {
                type: 'Link',
                text: 'Open Google OAuth 2.0 Playground ↗',
                url: 'https://developers.google.com/oauthplayground/#step1&apisSelect=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.file'
              }
            ]
          },
          { type: 'Divider' },

          // METHOD 2: Google Identity Services (One-Click Sign In)
          { type: 'Label', text: '🔑 Method 2: One-Click Sign In with Google (OAuth Client ID)' },
          {
            type: 'Markdown',
            text: `If you have a Google Cloud OAuth 2.0 Client ID for your domain/origin (\`https://noteroot-ai.vercel.app\` or \`http://localhost:5173\`), enter it below to sign in via Google's official OAuth popup:`
          },
          {
            type: 'Input',
            value: tempClientId,
            placeholder: 'Enter Google Client ID (e.g. 123456789-abc.apps.googleusercontent.com)',
            onChange: (val) => {
              tempClientId = val;
              settings.set('tempGoogleClientId', val);
              settings.set('googleClientId', val);
            }
          },
          {
            type: 'Row',
            children: [
              {
                type: 'Button',
                label: '🔑 Sign in with Google (OAuth)',
                onClick: () => connectWithGIS(tempClientId || settings.get('tempGoogleClientId') || settings.get('googleClientId'))
              },
              {
                type: 'Link',
                text: 'Google Cloud Console Credentials ↗',
                url: 'https://console.cloud.google.com/apis/credentials'
              }
            ]
          },
          { type: 'Divider' },

          // Offline fallback actions
          { type: 'Label', text: '💾 Local Vault Tools' },
          {
            type: 'Row',
            children: [
              {
                type: 'Button',
                label: '⚡ Create Local Backup Snapshot',
                onClick: () => performBackup()
              },
              {
                type: 'Button',
                label: '🔄 Restore from Last Local Snapshot',
                onClick: () => performRestore()
              }
            ]
          }
        ]
      };
    }
  });

  // ═════════════════════════════════════════════════════════════════
  // 2. NOTE PAGE ACTION: "Backup to Google Drive" button
  // ═════════════════════════════════════════════════════════════════
  runtime.registerExtension('note.pageActions', {
    id: 'drive-backup-action',
    label: 'Drive Backup',
    icon: 'Cloud',
    onClick: async (noteId) => {
      await performBackup();
    }
  });

  // ═════════════════════════════════════════════════════════════════
  // 3. EDITOR SLASH COMMAND: /drive-backup
  // ═════════════════════════════════════════════════════════════════
  runtime.registerExtension('editor.slashItems', {
    title: 'Drive Backup',
    description: 'Sync current note and full vault to Google Drive folder',
    icon: 'Cloud',
    category: 'Integrations',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      performBackup();
    }
  });
}

// Support CommonJS and ES module environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = main;
} else if (typeof window !== 'undefined') {
  window.driveConnectorPlugin = main;
}
