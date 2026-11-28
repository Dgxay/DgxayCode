'use strict';

/**
 * Copyright (c) 2026 Dgxay.
 *
 * DgxayCode desktop entry. The product opens directly into the complete
 * DeepSeek Harness workspace; the previous DgxayCode renderer is retired.
 *
 * DeepSeek Harness is Copyright (c) 2026 DeepSeek and licensed under MIT.
 * See ThirdPartyNotices.md and LICENSE-DEEPSEEK-HARNESS.
 */

const { app, dialog, Menu } = require('electron');
const { DeepSeekHarness } = require('./harness');

app.setAppUserModelId('com.dgxay.code');

if (process.env.DCB_DISABLE_GPU === '1') {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('in-process-gpu');
}

const harness = new DeepSeekHarness();
let opening = null;

function configureMenu() {
  if (process.platform !== 'darwin') {
    Menu.setApplicationMenu(null);
    return;
  }
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { role: 'windowMenu' }])
  );
}

function openWorkspace() {
  if (opening) return opening;
  opening = harness.open()
    .then((result) => {
      if (result.ok) return result;
      const message = result.error || 'DgxayCode 工作台启动失败';
      console.error('[harness]', message);
      dialog.showErrorBox('DgxayCode', message);
      app.quit();
      return result;
    })
    .finally(() => {
      opening = null;
    });
  return opening;
}

app.whenReady().then(() => {
  configureMenu();
  app.on('activate', () => {
    void openWorkspace();
  });
  void openWorkspace();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  harness.dispose();
});
