'use strict';

/**
 * Copyright (c) 2026 Dgxay.
 *
 * Installs the DgxayCode presentation skin before the upstream Harness
 * renderer paints, so its branding and first-run dialogs never appear.
 *
 * DeepSeek Harness is Copyright (c) 2026 DeepSeek and licensed under MIT.
 * See ThirdPartyNotices.md and LICENSE-DEEPSEEK-HARNESS.
 */

const { ipcRenderer } = require('electron');

const SKIN_CHANNEL = 'dcb-harness:skin-script';

function install() {
  const script = ipcRenderer.sendSync(SKIN_CHANNEL);
  if (typeof script !== 'string' || !script) {
    console.warn('[harness] skin script unavailable');
    return;
  }

  (0, eval)(script);
}

if (document.documentElement) {
  install();
} else {
  const observer = new MutationObserver(() => {
    if (!document.documentElement) return;
    observer.disconnect();
    install();
  });
  observer.observe(document, { childList: true });
}
