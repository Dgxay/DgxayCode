<!--
Copyright (c) 2026 Dgxay.
DeepSeek Harness portions: Copyright (c) 2026 DeepSeek, MIT License.
-->

# DeepSeek Harness UI Integration

This integration exposes the complete DeepSeek Harness Web UI from DgxayCode
as the application's only interface. The previous DgxayCode renderer is no
longer created or loaded.

## Source and version

- Repository analyzed: `D:\DeepSeekHarnessCode\deepseek-harness-master`
- Runtime package: `@deepseek-ai/dsh@0.2.3-alpha.2` (the source checkout version)
- Upstream license: MIT, Copyright (c) 2026 DeepSeek
- Local license text: `LICENSE-DEEPSEEK-HARNESS`
- Third-party notice: `ThirdPartyNotices.md`

## Why the UI is hosted rather than copied

The Harness UI is not a standalone component bundle. It is a browser half of a
Host-backed Cordis application:

- The React 18 root is mounted by `packages/client/ui-renderer`.
- The shell occupies the `root` slot in `packages/client/ui-layout`.
- The sidebar, conversation, chat transcript, composer, settings, and right
  panel are separate plugin packages connected through typed slots.
- Chat, tools, workspace, model, and settings data come from Host services over
  an authenticated WebSocket/HTTP gateway.
- `apps/web/vite.config.ts` explicitly rejects standalone Vite serving because
  the Host must inject `window.__DSH_BOOT__` and the client module graph.

The relevant client packages contain thousands of files and import internal
CSS Modules, Lexical, TanStack Virtual, Shiki, KaTeX, Zod, Cordis, and slot
contracts. Copying those files into a Vanilla renderer would create an inert
boot page or a heavily modified, unmaintainable application. The integration
therefore launches the unmodified upstream UI and preserves its full behavior.

## Core UI composition

| Layer | Upstream component/package | Role in the complete UI |
| --- | --- | --- |
| Web entry | `apps/web/src/main.ts` | Boots the client application |
| Boot kernel | `packages/client/web` | Creates the module graph and waits for Host boot injections |
| React mount | `packages/client/ui-renderer` | Mounts the `root` slot |
| Shell frame | `packages/client/ui-layout/src/client/AppFrame.tsx` | Sidebar, center, right panel, overlays, window chrome |
| Navigation | `packages/client/ui-sidebar` | Session list, workspaces, footer actions |
| Conversation | `packages/client/ui-conversation` | Conversation shell, composer, input flow, queues |
| Chat transcript | `packages/client/ui-chat` | Messages, reasoning, tool rows, markdown, turn controls |
| Settings | `packages/client/ui-settings*` | Models, accounts, plugins, updates, general settings |
| Theme and primitives | `packages/client/ui-theme`, `packages/client/ui-primitives` | Tokens, controls, menus, modals, markdown/code UI |
| Host API | `apps/cli`, `packages/bundle/web-app` | Authenticated loopback server and WebSocket transport |

## Integration architecture

1. `src/main/main.js` opens the Harness workspace at application startup.
2. `src/main/harness.js` resolves Node.js and the pinned upstream CLI.
3. It starts `dsh web --no-open --host 127.0.0.1 --port 0`.
4. It parses the authenticated startup URL and opens it in a dedicated
   `BrowserWindow` with:
   - no DgxayCode application preload
   - no Node integration
   - `sandbox: true`
   - a dedicated Harness-only preload that installs the presentation skin before
     the first frame
   - a separate persistent session partition
   - same-origin navigation only
5. Closing the Harness window stops its Host process. Quitting DgxayCode also
   stops the Host.

The launch token is passed only to the Harness window and is redacted from
error text and stored logs.

## DgxayCode presentation layer

The isolated Harness page receives a runtime-only presentation skin. It does
not modify the upstream package:

- The skin is installed by the sandboxed Harness preload at document start, so
  the boot screen and first paint already use DgxayCode branding.
- The boot wordmark is shown as `DGXAY`.
- Sidebar, product, and version labels use the DgxayCode brand and `v1.8.0`.
- The first-run preview notice is dismissed automatically.
- The first-run DeepSeek account onboarding dialog is closed automatically.
- The signed-out account menu omits its `登录` / `Sign in` row.
- The account menu's `意见反馈` entry opens
  `https://github.com/Dgxay/DgxayCode/issues` instead of the upstream form.
- The Settings `插件管理` / `Plugins` entry is removed, so the plugin page is
  not reachable from the application UI.
- The Agent preset picker beside the workspace selector is removed.
- Navigation entries without a corresponding feature are hidden.

## Runtime requirements

- Node.js `^24.22.3 || >=26.13.1` on `PATH`, or a compatible executable in
  `DSH_NODE`.
- Run `npm install` in the DgxayCode project.
- Harness data remains in its own `~/.dsh` home, separate from `~/.dcb`.

Optional environment overrides:

| Variable | Purpose |
| --- | --- |
| `DSH_NODE` | Node.js executable used for the Harness Host |
| `DSH_CLI` | External Harness `lib/bin.js` path |
| `DSH_HARNESS_CWD` | Host working directory |
| `DSH_HOME` | Harness configuration and session home |

## Verification

The integration was verified with:

- `node --check` on the main, preload, and renderer scripts.
- Pure helper checks for URL parsing, token redaction, and Node version gates.
- A real Electron launch that started the upstream Host and captured the full
  Harness UI.
- Real DOM checks for the hidden plugin-management entry, the removed Agent
  preset picker, and the redirected feedback URL.
- A full renderer-to-IPC launch from the DgxayCode sidebar entry.

## Packaging note

The Harness Host is a Node.js process and must run outside an ASAR archive.
The electron-builder configuration therefore sets `asar` to `false`, and sets
`npmRebuild` to `false` so native modules keep their Node ABI instead of being
rebuilt for Electron. Production packaging must still provide a compatible
Node runtime on `PATH` or through `DSH_NODE`, or the launcher will show a clear
configuration error.
