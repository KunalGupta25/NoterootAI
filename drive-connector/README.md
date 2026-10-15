---
name: Drive Connector
author: NoteRoot AI Team
category: Cloud & Backup
version: 1.0.0
tags: [google-drive, backup, restore, multi-account, sync]
description: >
  Connect your Google Drive to automatically create backups for all your notes.
  Features vault restoration into new NoteRoot AI accounts, "Show in Drive" navigation,
  and multi-account isolation powered by an information.json registry.
main: plugin.js
---

# ☁️ Drive Connector — Google Drive Backup & Multi-Account Restore

**Drive Connector** is a custom NoteRoot AI plugin that links your personal or team Google Drive to your workspace, creating automated snapshots of your notes, spaces, and tags.

---

## ✨ Features

- **⚡ Automatic & On-Demand Backup:** Creates complete JSON snapshots of all vault notes, metadata, and spaces into your Google Drive backup directory.
- **🔄 Restore to New Accounts:** Easily restore your backed-up notes and spaces into a new or existing NoteRoot AI account with a single click.
- **📂 Show in Drive Button:** Instantly open the exact Google Drive folder where your active account's backup data is securely stored.
- **👥 Multi-Account Support via `information.json`:** Uses an `information.json` registry file at the root of your Google Drive backup location to organize, track, and isolate multiple accounts under a single shared Google Drive without data overwriting or collisions.
- **📝 Editor Quick Actions & Slash Commands:** Use the `☁️ Drive` button in the note toolbar or type `/Backup to Google Drive` directly inside the note editor.

---

## 🗂️ Multi-Account Registry: `information.json`

The root Google Drive backup folder (`NoteRoot_AI_Backups`) maintains an **`information.json`** manifest that maps each user account to its dedicated folder and backup files:

```json
{
  "title": "NoteRoot AI Google Drive Multi-Account Registry",
  "version": "1.0.0",
  "driveRootFolderName": "NoteRoot_AI_Backups",
  "driveRootFolderId": "drive_folder_noteroot_root",
  "driveRootUrl": "https://drive.google.com/drive/folders/drive_folder_noteroot_root",
  "lastUpdated": "2026-10-15T23:45:00.000Z",
  "accounts": {
    "acc_demo_6620": {
      "accountId": "acc_demo_6620",
      "email": "demo@noteroot.ai",
      "name": "Demo User",
      "folderName": "NoteRoot_demo_noteroot_ai",
      "folderUrl": "https://drive.google.com/drive/folders/1aB2cD3eF4gH5iJ6kL7mN8oP",
      "lastBackupAt": "2026-10-15T23:45:00.000Z",
      "backupFileName": "noteroot_vault_backup_demo.json",
      "notesCount": 12,
      "status": "synchronized"
    }
  }
}
```

---

## 🚀 How to Test & Install in NoteRoot AI

### Option A: Install via Plugins Section Upload
1. Open NoteRoot AI and navigate to **Settings → Plugins** (or `/plugins`).
2. Switch to the **Upload** tab.
3. Drag & drop or browse to select `drive-connector/plugin.js`.
4. Click **Install Plugin**.
5. Go to **Settings → Plugins** to view the **Google Drive Connector** panel, run backups, click **Show in Drive**, or test **Restore Vault**!

### Option B: 1-Click Install from Marketplace
1. Navigate to **Plugins** → **Marketplace** tab.
2. Locate **Drive Connector** in the list.
3. Click **Install**.
4. Open any note or go to **Settings → Plugins** to start using it immediately!

---

## 🔒 Security & Privacy

All backups are stored in your configured Google Drive. No third-party servers have access to your vault contents or Google Drive credentials.
