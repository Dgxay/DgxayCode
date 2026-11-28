'use strict';

/**
 * Copyright (c) 2026 Dgxay.
 *
 * DeepSeek Harness UI integration for DgxayCode. DeepSeek Harness is
 * Copyright (c) 2026 DeepSeek and licensed under the MIT License. This file
 * launches the unmodified upstream web application in an isolated window; it
 * does not copy or relicense Harness UI source code.
 *
 * See ThirdPartyNotices.md and LICENSE-DEEPSEEK-HARNESS.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile, spawn } = require('child_process');
const { promisify } = require('util');
const { BrowserWindow, app, ipcMain, shell } = require('electron');
const { buildHarnessSkinScript } = require('./harness-skin');

const execFileAsync = promisify(execFile);
const HARNESS_SKIN_CHANNEL = 'dcb-harness:skin-script';
const FEEDBACK_URL = 'https://github.com/Dgxay/DgxayCode/issues';
const FEEDBACK_SOURCE_HOST = 'trtgsjkv6r.feishu.cn';
const FEEDBACK_SOURCE_PATH = '/share/base/form/shrcnlCoGElW7MQznGy9r3YYXcg';
const START_TIMEOUT_MS = 180_000;
const MAX_LOG_LINES = 120;
const ANSI_PATTERN = /\u001b\[[0-?]*[ -/]*[@-~]/g;
const STARTUP_URL_PATTERN = /(?:^|\s)dsh web:\s+(https?:\/\/[^\s]+)/i;
const REQUIRED_NODE = '^24.22.3 || >=26.13.1';

function stripAnsi(value) {
  return String(value || '').replace(ANSI_PATTERN, '');
}

function redactSensitive(value) {
  const text = String(value || '');
  try {
    const url = new URL(text);
    if (url.searchParams.has('token')) url.searchParams.set('token', '[redacted]');
    return url.href;
  } catch {
    return text.replace(/([?&]token=)[^&\s]+/gi, '$1[redacted]');
  }
}

function parseStartupUrl(value) {
  const match = STARTUP_URL_PATTERN.exec(stripAnsi(value));
  if (!match) return null;
  try {
    const url = new URL(match[1]);
    const loopback = url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.hostname === '[::1]';
    if (!loopback || (url.protocol !== 'http:' && url.protocol !== 'https:')) return null;
    return url.href;
  } catch {
    return null;
  }
}

function parseNodeVersion(value) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(String(value || '').trim());
  return match
    ? { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) }
    : null;
}

function externalNavigationTarget(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (url.hostname === FEEDBACK_SOURCE_HOST && url.pathname === FEEDBACK_SOURCE_PATH) {
      return FEEDBACK_URL;
    }
    return url.href;
  } catch {
    return null;
  }
}

function supportsHarnessNode(version) {
  if (!version) return false;
  if (version.major === 24) {
    return version.minor > 22 || (version.minor === 22 && version.patch >= 3);
  }
  if (version.major === 26) {
    return version.minor > 13 || (version.minor === 13 && version.patch >= 1);
  }
  return version.major >= 27;
}

function resolveHarnessCli(projectRoot = app.getAppPath()) {
  if (process.env.DSH_CLI) {
    const override = path.resolve(process.env.DSH_CLI);
    if (!fs.existsSync(override)) {
      throw new Error(`DSH_CLI 指向的文件不存在：${override}`);
    }
    return override;
  }

  let manifestPath = null;
  try {
    manifestPath = require.resolve('@deepseek-ai/dsh/package.json', { paths: [projectRoot] });
  } catch {
    const fallback = path.join(projectRoot, 'node_modules', '@deepseek-ai', 'dsh', 'package.json');
    if (fs.existsSync(fallback)) manifestPath = fallback;
  }
  if (!manifestPath) {
    throw new Error('未找到 @deepseek-ai/dsh，请先在项目目录运行 npm install。');
  }

  const cliPath = path.join(path.dirname(manifestPath), 'lib', 'bin.js');
  if (!fs.existsSync(cliPath)) {
    throw new Error(`DgxayCode 工作台组件不完整：${cliPath}`);
  }
  if (cliPath.includes('.asar')) {
    throw new Error('DgxayCode 工作台需要以独立 Node 进程运行，请将 DSH_CLI 指向 ASAR 外部的 CLI。');
  }
  return cliPath;
}

async function assertNodeRuntime(executable) {
  let versionText;
  try {
    const result = await execFileAsync(executable, ['--version'], {
      windowsHide: true,
      timeout: 15_000
    });
    versionText = result.stdout;
  } catch (error) {
    throw new Error(
      `无法运行 Node.js（${executable}）。DgxayCode 工作台需要 Node.js ${REQUIRED_NODE}；` +
      '请安装受支持的 Node.js，或用 DSH_NODE 指定 node 可执行文件。'
    );
  }

  const version = parseNodeVersion(versionText);
  if (!supportsHarnessNode(version)) {
    throw new Error(
      `当前 Node.js 版本为 ${String(versionText).trim() || '未知'}，` +
      `DgxayCode 工作台需要 ${REQUIRED_NODE}。请升级 Node.js 或设置 DSH_NODE。`
    );
  }
  return version;
}

function childEnvironment() {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.ELECTRON_NO_ATTACH_CONSOLE;
  delete env.NODE_OPTIONS;
  env.NO_COLOR = '1';
  return env;
}

class DeepSeekHarness {
  constructor() {
    this.child = null;
    this.url = null;
    this.window = null;
    this.starting = null;
    this.logs = [];
  }

  async open() {
    if (this.window && !this.window.isDestroyed()) {
      if (this.window.isMinimized()) this.window.restore();
      this.window.show();
      this.window.focus();
      return { ok: true, reused: true };
    }

    if (!this.starting) {
      this.starting = this.#open()
        .catch((error) => {
          const message = redactSensitive(error?.message || error);
          console.error('[harness]', message);
          return { ok: false, error: message };
        })
        .finally(() => {
          this.starting = null;
        });
    }
    return this.starting;
  }

  dispose() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.destroy();
    }
    this.window = null;
    this.url = null;
    this.#stopProcess();
  }

  async #open() {
    if (!this.url) await this.#start();

    const window = this.#createWindow();
    try {
      await window.loadURL(this.url);
      await this.#applySkin(window);
      if (!window.isDestroyed()) window.show();
      return { ok: true, reused: false };
    } catch (error) {
      if (!window.isDestroyed()) window.destroy();
      this.window = null;
      this.url = null;
      this.#stopProcess();
      throw new Error(`DgxayCode 工作台加载失败：${redactSensitive(error?.message || error)}`);
    }
  }

  async #start() {
    const nodeExecutable = process.env.DSH_NODE || 'node';
    const nodeVersion = await assertNodeRuntime(nodeExecutable);
    const cliPath = resolveHarnessCli();
    const cwd = process.env.DSH_HARNESS_CWD
      ? path.resolve(process.env.DSH_HARNESS_CWD)
      : os.homedir();

    const child = spawn(
      nodeExecutable,
      [cliPath, 'web', '--no-open', '--host', '127.0.0.1', '--port', '0'],
      {
        cwd,
        env: childEnvironment(),
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true
      }
    );

    this.child = child;
    this.logs = [];
    console.log(`[harness] starting with Node ${nodeVersion.major}.${nodeVersion.minor}.${nodeVersion.patch}`);

    await new Promise((resolve, reject) => {
      let settled = false;
      let buffer = '';

      const cleanupStartListeners = () => {
        clearTimeout(timer);
        child.stdout?.removeListener('data', onOutput);
        child.stderr?.removeListener('data', onOutput);
        child.stdout?.resume();
        child.stderr?.resume();
        child.removeListener('error', onStartError);
      };

      const settle = (error, url) => {
        if (settled) return;
        settled = true;
        cleanupStartListeners();
        if (error) {
          this.#stopProcess();
          reject(error);
          return;
        }
        this.url = url;
        resolve();
      };

      const onOutput = (chunk) => {
        const text = stripAnsi(chunk.toString('utf8'));
        buffer += text;
        if (buffer.length > 64_000) buffer = buffer.slice(-64_000);
        for (const line of text.split(/\r?\n/)) {
          if (!line.trim()) continue;
          this.logs.push(redactSensitive(line.trim()));
          if (this.logs.length > MAX_LOG_LINES) this.logs.shift();
        }
        const url = parseStartupUrl(buffer);
        if (url) settle(null, url);
      };

      const onStartError = (error) => {
        settle(new Error(`无法启动 DgxayCode 工作台：${redactSensitive(error?.message || error)}`));
      };

      const timer = setTimeout(() => {
        settle(new Error(`DgxayCode 工作台启动超时（${Math.round(START_TIMEOUT_MS / 1000)} 秒）。`));
      }, START_TIMEOUT_MS);

      child.stdout?.setEncoding('utf8');
      child.stderr?.setEncoding('utf8');
      child.stdout?.on('data', onOutput);
      child.stderr?.on('data', onOutput);
      child.once('error', onStartError);
      child.once('exit', (code, signal) => {
        this.child = null;
        this.url = null;
        if (settled) {
          console.warn(`[harness] host exited (${signal || code})`);
          return;
        }
        const detail = this.logs.slice(-6).join('\n');
        settle(
          new Error(
            `DgxayCode 工作台进程退出（${signal || code}）。` + (detail ? `\n${detail}` : '')
          )
        );
      });
    });
  }

  async #applySkin(targetWindow) {
    if (!targetWindow || targetWindow.isDestroyed()) return;
    try {
      const installed = await targetWindow.webContents.executeJavaScript(
        "document.documentElement?.hasAttribute('data-dcb-harness-skin') === true",
        true
      );
      if (installed) return;
      await targetWindow.webContents.executeJavaScript(buildHarnessSkinScript(), true);
    } catch (error) {
      console.warn('[harness] failed to apply DgxayCode skin:', redactSensitive(error?.message || error));
    }
  }

  #createWindow() {
    const iconPath = path.join(__dirname, '../renderer/assets/icon.png');
    const preloadPath = path.join(__dirname, 'harness-preload.js');
    const origin = new URL(this.url).origin;
    const window = new BrowserWindow({
      width: 1440,
      height: 940,
      minWidth: 980,
      minHeight: 640,
      show: false,
      autoHideMenuBar: true,
      backgroundColor: '#ffffff',
      title: 'DgxayCode',
      icon: fs.existsSync(iconPath) ? iconPath : undefined,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        preload: preloadPath,
        webviewTag: false,
        spellcheck: false,
        partition: 'persist:deepseek-harness'
      }
    });

    const skinHandler = (event) => {
      if (event.sender === window.webContents) {
        event.returnValue = buildHarnessSkinScript();
      }
    };
    ipcMain.on(HARNESS_SKIN_CHANNEL, skinHandler);

    window.setMenuBarVisibility(false);
    window.webContents.on('dom-ready', () => {
      void this.#applySkin(window);
    });
    window.webContents.on('did-finish-load', () => {
      void this.#applySkin(window);
    });
    window.once('ready-to-show', () => {
      if (!window.isDestroyed()) window.show();
    });

    window.webContents.setWindowOpenHandler(({ url }) => {
      const target = externalNavigationTarget(url);
      if (target) void shell.openExternal(target);
      return { action: 'deny' };
    });
    window.webContents.on('will-navigate', (event, url) => {
      try {
        if (new URL(url).origin === origin) return;
      } catch {
        // Malformed targets are blocked below.
      }
      event.preventDefault();
      const target = externalNavigationTarget(url);
      if (target) void shell.openExternal(target);
    });
    window.webContents.on('will-attach-webview', (event) => event.preventDefault());
    window.on('closed', () => {
      ipcMain.removeListener(HARNESS_SKIN_CHANNEL, skinHandler);
      this.window = null;
      this.url = null;
      this.#stopProcess();
    });

    this.window = window;
    return window;
  }

  #stopProcess() {
    const child = this.child;
    this.child = null;
    if (!child || child.exitCode !== null) return;

    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
          windowsHide: true,
          stdio: 'ignore'
        });
      } else {
        child.kill('SIGTERM');
      }
    } catch (error) {
      console.warn('[harness] failed to stop host:', error?.message || error);
    }
  }
}

module.exports = {
  DeepSeekHarness,
  externalNavigationTarget,
  parseNodeVersion,
  parseStartupUrl,
  redactSensitive,
  supportsHarnessNode
};
