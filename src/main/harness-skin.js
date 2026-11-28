'use strict';

/**
 * Copyright (c) 2026 Dgxay.
 *
 * Browser-side presentation adapter for the DgxayCode workspace. It changes
 * only the rendered UI of the unmodified upstream application.
 *
 * DeepSeek Harness is Copyright (c) 2026 DeepSeek and licensed under MIT.
 * See ThirdPartyNotices.md and LICENSE-DEEPSEEK-HARNESS.
 */

const fs = require('fs');
const path = require('path');

const BRAND_NAME = 'DgxayCode';
const BRAND_VERSION = 'v1.8.0';
const BOOT_WORDMARK = 'DGXAY';
const DEFAULT_HOME_TITLE = '探索未至之境';
const HOME_TITLE = '想要干点什么吗';
const PREVIEW_NOTICE_TITLE = '预览版说明';
const PREVIEW_NOTICE_TITLES = Object.freeze(['预览版说明', 'Preview Notice']);
const PREVIEW_CONTINUE_LABELS = Object.freeze(['继续', 'Continue']);
const STARTUP_DIALOG_TITLES = Object.freeze(['开始使用', 'Get started']);
const STARTUP_CLOSE_LABELS = Object.freeze(['关闭', 'Close']);
const REMOVED_NAV_LABELS = Object.freeze(['插件', '自动化任务', '更多']);
const REMOVED_MENU_LABELS = Object.freeze([
  '登录',
  'Sign in',
  'ログイン',
  'Iniciar sesión',
  'Connectez-vous',
  'Melden Sie sich an',
  'Войти',
  'Faça login'
]);
const REMOVED_SETTINGS_NAV_ICONS = Object.freeze([
  'dsw-icon-personalization-outline-medium'
]);
const BRAND_ICON_PATH = path.join(__dirname, '../renderer/assets/icon.png');

function brandIconDataUrl() {
  try {
    return `data:image/png;base64,${fs.readFileSync(BRAND_ICON_PATH).toString('base64')}`;
  } catch {
    return '';
  }
}

function installHarnessSkin(options) {
  const stateKey = '__DCB_HARNESS_SKIN__';
  if (window[stateKey]) {
    window[stateKey].refresh();
    return;
  }

  const brand = String(options.brandName || 'DgxayCode');
  const version = String(options.version || 'v1.8.0');
  const bootWordmark = String(options.bootWordmark || 'DGXAY');
  const defaultHomeTitle = String(options.defaultHomeTitle || '探索未至之境');
  const homeTitle = String(options.homeTitle || '想要干点什么吗');
  const previewTitle = String(options.previewTitle || '预览版说明');
  const previewTitles = Array.from(new Set([
    previewTitle,
    ...(options.previewTitles || [])
  ].filter(Boolean)));
  const continueLabels = new Set(options.previewContinueLabels || []);
  const startupDialogTitles = new Set(options.startupDialogTitles || ['开始使用', 'Get started']);
  const startupCloseLabels = new Set(options.startupCloseLabels || ['关闭', 'Close']);
  const iconUrl = String(options.iconDataUrl || '');
  const removedLabels = new Set(options.removedNavLabels || []);
  const removedMenuLabels = new Set(options.removedMenuLabels || []);
  const removedSettingsNavIcons = new Set(options.removedSettingsNavIcons || []);
  const brandPattern = /DeepSeek\s+Harness/i;
  const brandPatternGlobal = /DeepSeek\s+Harness/gi;
  const productVersionPattern = /((?:当前版本|Current version)\s*[：:]\s*)(?:v)?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/gi;
  const previewDialogSelector = previewTitles
    .map((title) => `[role="dialog"][aria-label=${JSON.stringify(title)}]`)
    .join(',\n    ');
  const startupDialogSelector = Array.from(startupDialogTitles)
    .map((title) => `[role="dialog"][aria-label=${JSON.stringify(title)}]`)
    .join(',\n    ');
  const removedNavSelector = Array.from(removedLabels)
    .map((label) => `nav button[aria-label=${JSON.stringify(label)}]`)
    .join(',\n    ');
  const removedSettingsNavSelector = Array.from(removedSettingsNavIcons)
    .map((icon) => `[role="dialog"] nav button:has(svg[data-icon=${JSON.stringify(icon)}])`)
    .join(',\n    ');

  document.documentElement.setAttribute('data-dcb-harness-skin', version);
  document.documentElement.setAttribute('data-dcb-startup-onboarding', '');
  let startupOnboardingActive = true;

  const style = document.createElement('style');
  style.id = 'dcb-harness-skin-style';
  style.textContent = `
    [data-dcb-hidden],
    [data-dcb-suppress] {
      display: none !important;
    }
    ${previewDialogSelector},
    body > :has(${previewDialogSelector}) {
      display: none !important;
    }
    html[data-dcb-startup-onboarding] ${startupDialogSelector},
    html[data-dcb-startup-onboarding] body > :has(${startupDialogSelector}) {
      display: none !important;
    }
    ${removedNavSelector} {
      display: none !important;
    }
    ${removedSettingsNavSelector} {
      display: none !important;
    }
    [data-slot="conversation.hero.agentPreset"] {
      display: none !important;
    }
    svg[data-dcb-brand-glyph] {
      width: 28px !important;
      height: 28px !important;
      background-image: url("${iconUrl}");
      background-position: center;
      background-repeat: no-repeat;
      background-size: contain;
      border-radius: 5px;
      color: transparent !important;
    }
    svg[data-dcb-brand-glyph] > * {
      display: none !important;
    }
    [data-slot="sidebar.brand.mark"] svg[data-dcb-brand-glyph] {
      width: 22px !important;
      height: 22px !important;
    }
    [data-slot="sidebar.brand.name"] {
      display: inline-flex !important;
      align-items: center;
      min-height: 24px;
    }
    [data-slot="sidebar.brand.name"] > svg {
      display: none !important;
    }
    [data-slot="sidebar.brand.name"]::after {
      content: "${brand}";
      display: block;
      color: var(--dsw-alias-label-primary, currentColor);
      font-family: var(--ds-font-family, "Segoe UI", system-ui, sans-serif);
      font-size: 15px;
      font-weight: 600;
      line-height: 24px;
      letter-spacing: -0.02em;
      white-space: nowrap;
    }
    canvas[data-home-whale] {
      display: none !important;
    }
  `;
  (document.head || document.documentElement).appendChild(style);

  function replaceBrand(value) {
    brandPatternGlobal.lastIndex = 0;
    return value.replace(brandPatternGlobal, brand);
  }

  function patchTextNode(node) {
    if (!node || typeof node.nodeValue !== 'string') return;
    const parent = node.parentElement;
    if (parent && /^(SCRIPT|STYLE|TEXTAREA)$/.test(parent.tagName)) return;

    const trimmed = node.nodeValue.trim();
    if (trimmed === defaultHomeTitle) {
      node.nodeValue = homeTitle;
      return;
    }
    if (trimmed === 'HARNESS' && parent?.closest('[data-dsh-boot]')) {
      node.nodeValue = bootWordmark;
      return;
    }
    if (trimmed === '预览版' && parent && /previewBadge/i.test(String(parent.className || ''))) {
      node.nodeValue = version;
      return;
    }

    const next = replaceBrand(node.nodeValue).replace(productVersionPattern, `$1${version}`);
    if (next !== node.nodeValue) node.nodeValue = next;
  }

  function patchAttributes(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return;
    for (const name of ['aria-label', 'title', 'placeholder', 'alt', 'data-tooltip']) {
      const value = element.getAttribute(name);
      if (!value || !brandPattern.test(value)) continue;
      element.setAttribute(name, replaceBrand(value));
    }
  }

  function markBrandGlyph(svg) {
    if (!iconUrl) return;
    const viewBox = String(svg.getAttribute('viewBox') || '').replace(/\s+/g, ' ').trim();
    if (viewBox === '0 0 23.16 17.04') {
      svg.setAttribute('data-dcb-brand-glyph', '');
    }
  }

  function hideRemovedNavButton(button) {
    if (!button.closest('nav')) return;
    const label = String(button.getAttribute('aria-label') || '').trim();
    if (
      !removedLabels.has(label)
      && !label.startsWith('从侧边栏取消固定')
      && !/^unpin\b/i.test(label)
    ) return;
    const entry = button.closest('[class*="panelEntry"]') || button;
    entry.setAttribute('data-dcb-hidden', 'nav');
  }

  function hideRemovedMenuItem(button) {
    const menu = button.closest('[role="menu"][class*="signedOutMenu"]');
    if (!menu) return;
    const label = String(
      button.querySelector('[class*="itemLabel"]')?.textContent || button.textContent || ''
    ).trim();
    if (!removedMenuLabels.has(label)) return;
    const entry = button.closest('[class*="itemWrap"]') || button;
    entry.setAttribute('data-dcb-hidden', 'menu-login');
    button.disabled = true;
  }

  function hideRemovedSettingsNavButton(button) {
    const nav = button.closest('[role="dialog"] nav');
    if (!nav) return;
    const removed = Array.from(button.querySelectorAll('svg[data-icon]')).some((svg) =>
      removedSettingsNavIcons.has(String(svg.getAttribute('data-icon') || ''))
    );
    if (!removed) return;

    button.setAttribute('data-dcb-hidden', 'settings-nav-plugins');
    button.disabled = true;
    if (button.getAttribute('aria-current') !== 'true') return;
    const fallback = Array.from(nav.querySelectorAll('button')).find((item) =>
      item !== button && !item.hasAttribute('data-dcb-hidden')
    );
    if (fallback) fallback.click();
  }

  function suppressPreviewNotice(dialog) {
    const label = String(dialog.getAttribute('aria-label') || '');
    const heading = String(dialog.querySelector('h2')?.textContent || '').trim();
    const text = String(dialog.innerText || dialog.textContent || '');
    const knownTitle = previewTitles.some((title) =>
      label === title || heading === title || label.includes(title)
    );
    const welcomeCopy = /(?:DeepSeek\s+Harness|DgxayCode)[\s\S]{0,200}\b0\.2\b/i.test(text);
    if (!knownTitle && !welcomeCopy) return;

    const overlay = dialog.parentElement;
    if (overlay) overlay.setAttribute('data-dcb-suppress', previewTitle);
    dialog.setAttribute('data-dcb-suppress', previewTitle);

    const root = document.getElementById('root');
    if (root && root.hasAttribute('inert')) root.removeAttribute('inert');

    if (dialog.getAttribute('data-dcb-preview-acknowledged') === 'true') return;
    const button = Array.from(dialog.querySelectorAll('button')).find((item) =>
      continueLabels.has(String(item.textContent || '').trim())
    );
    if (!button) return;
    dialog.setAttribute('data-dcb-preview-acknowledged', 'true');
    button.click();
  }

  function disarmStartupOnboarding() {
    if (!startupOnboardingActive) return;
    startupOnboardingActive = false;
    document.documentElement.removeAttribute('data-dcb-startup-onboarding');
    window.removeEventListener('pointerdown', disarmStartupOnboarding, true);
    window.removeEventListener('keydown', disarmStartupOnboarding, true);
  }

  function suppressStartupAccountDialog(dialog) {
    if (!startupOnboardingActive) return;
    const label = String(dialog.getAttribute('aria-label') || '');
    const heading = String(dialog.querySelector('h2')?.textContent || '').trim();
    const text = String(dialog.textContent || '');
    const knownTitle = Array.from(startupDialogTitles).some((title) =>
      label === title || heading === title || label.includes(title)
    );
    if (!knownTitle || !/API\s*Key/i.test(text)) return;

    const overlay = dialog.parentElement;
    if (overlay) overlay.setAttribute('data-dcb-suppress', 'startup-account');
    dialog.setAttribute('data-dcb-suppress', 'startup-account');

    const root = document.getElementById('root');
    if (root && root.hasAttribute('inert')) root.removeAttribute('inert');

    if (dialog.getAttribute('data-dcb-startup-dismissed') === 'true') return;
    const button = Array.from(dialog.querySelectorAll('button')).find((item) =>
      startupCloseLabels.has(String(item.getAttribute('aria-label') || '').trim())
    );
    if (!button) return;
    dialog.setAttribute('data-dcb-startup-dismissed', 'true');
    button.click();
    disarmStartupOnboarding();
  }

  function scanDialogs() {
    for (const dialog of document.querySelectorAll('[role="dialog"], dialog')) {
      suppressPreviewNotice(dialog);
      suppressStartupAccountDialog(dialog);
    }
  }

  function collapseEmptyPanelNav() {
    for (const nav of document.querySelectorAll('nav')) {
      const entries = Array.from(nav.querySelectorAll('button'));
      if (entries.length === 0) continue;
      if (entries.every((entry) => entry.closest('[data-dcb-hidden]'))) {
        nav.setAttribute('data-dcb-hidden', 'empty-nav');
      }
    }
  }

  function patchNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      patchTextNode(node);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    patchAttributes(node);
    if (node.tagName === 'SVG') markBrandGlyph(node);
    if (node.tagName === 'BUTTON') {
      hideRemovedNavButton(node);
      hideRemovedMenuItem(node);
      hideRemovedSettingsNavButton(node);
    }

    for (const dialog of node.querySelectorAll('[role="dialog"], dialog')) {
      suppressPreviewNotice(dialog);
      suppressStartupAccountDialog(dialog);
    }
    for (const svg of node.querySelectorAll('svg')) markBrandGlyph(svg);
    for (const button of node.querySelectorAll('button')) {
      hideRemovedNavButton(button);
      hideRemovedMenuItem(button);
      hideRemovedSettingsNavButton(button);
    }

    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) patchTextNode(walker.currentNode);

    if (node.matches?.('[role="dialog"], dialog')) {
      suppressPreviewNotice(node);
      suppressStartupAccountDialog(node);
    }
  }

  function refresh() {
    if (!document.body) return;
    document.title = replaceBrand(document.title);
    patchNode(document.body);
    scanDialogs();
    collapseEmptyPanelNav();
  }

  let queued = false;
  function queueRefresh() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      scanDialogs();
      collapseEmptyPanelNav();
    });
  }

  window.addEventListener('pointerdown', disarmStartupOnboarding, { capture: true });
  window.addEventListener('keydown', disarmStartupOnboarding, { capture: true });

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'characterData') {
        patchTextNode(record.target);
      } else if (record.type === 'childList') {
        for (const node of record.addedNodes) patchNode(node);
      } else if (record.type === 'attributes') {
        patchAttributes(record.target);
      }
    }
    queueRefresh();
  });
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['aria-label', 'title', 'placeholder', 'alt', 'data-tooltip']
  });

  window[stateKey] = {
    version,
    refresh,
    stop() {
      observer.disconnect();
      style.remove();
      document.documentElement.removeAttribute('data-dcb-harness-skin');
      document.documentElement.removeAttribute('data-dcb-startup-onboarding');
      delete window[stateKey];
    }
  };
  refresh();
}

function buildHarnessSkinScript() {
  const options = {
    brandName: BRAND_NAME,
    version: BRAND_VERSION,
    bootWordmark: BOOT_WORDMARK,
    defaultHomeTitle: DEFAULT_HOME_TITLE,
    homeTitle: HOME_TITLE,
    previewTitle: PREVIEW_NOTICE_TITLE,
    previewTitles: PREVIEW_NOTICE_TITLES,
    previewContinueLabels: PREVIEW_CONTINUE_LABELS,
    startupDialogTitles: STARTUP_DIALOG_TITLES,
    startupCloseLabels: STARTUP_CLOSE_LABELS,
    removedNavLabels: REMOVED_NAV_LABELS,
    removedMenuLabels: REMOVED_MENU_LABELS,
    removedSettingsNavIcons: REMOVED_SETTINGS_NAV_ICONS,
    iconDataUrl: brandIconDataUrl()
  };
  return `(${installHarnessSkin.toString()})(${JSON.stringify(options)})`;
}

module.exports = {
  BRAND_NAME,
  BRAND_VERSION,
  BOOT_WORDMARK,
  DEFAULT_HOME_TITLE,
  HOME_TITLE,
  PREVIEW_CONTINUE_LABELS,
  PREVIEW_NOTICE_TITLES,
  STARTUP_CLOSE_LABELS,
  STARTUP_DIALOG_TITLES,
  REMOVED_MENU_LABELS,
  REMOVED_NAV_LABELS,
  REMOVED_SETTINGS_NAV_ICONS,
  buildHarnessSkinScript,
  installHarnessSkin
};
