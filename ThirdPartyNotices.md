<!--
Copyright (c) 2026 Dgxay.
DeepSeek Harness portions: Copyright (c) 2026 DeepSeek, MIT License.
-->

# Third-Party Notices

DgxayCode integrates the complete DeepSeek Harness Web UI through the
unmodified upstream runtime package. This notice applies to that integration.

## DeepSeek Harness

- **Project:** DeepSeek Harness (`dsh`)
- **Upstream source:** https://github.com/deepseek-ai/deepseek-harness
- **Source used for this integration:** `D:\DeepSeekHarnessCode\deepseek-harness-master`
- **Runtime package:** `@deepseek-ai/dsh@0.2.3-alpha.2`
- **Copyright:** Copyright (c) 2026 DeepSeek
- **License:** MIT
- **Usage:** DgxayCode starts the upstream `dsh web` host on loopback and
  displays its complete Web UI in a dedicated, isolated Electron window,
  applying DgxayCode branding and presentation adjustments at runtime.
- **Modification status:** The upstream UI and host source are not modified or
  copied into DgxayCode. DgxayCode contributes only the launcher, lifecycle
  management, and isolated window/presentation adapter.

The MIT license text for DeepSeek Harness is reproduced in
[LICENSE-DEEPSEEK-HARNESS](LICENSE-DEEPSEEK-HARNESS).

### Transitive dependencies

DeepSeek Harness includes its own third-party runtime dependencies. The
upstream project publishes generated notices and lockfile metadata:

- https://github.com/deepseek-ai/deepseek-harness/blob/master/THIRD_PARTY_NOTICES.md
- https://github.com/deepseek-ai/deepseek-harness/blob/master/pnpm-lock.yaml

Those upstream notices must remain available when redistributing a packaged
Harness runtime. The Harness package itself also carries its MIT license at
`node_modules/@deepseek-ai/dsh/LICENSE` after installation.

## DgxayCode integration code

The files added or changed to launch and host the UI are part of DgxayCode:

- `Copyright (c) 2026 Dgxay`
- **License:** GNU General Public License v3.0 only

The DeepSeek Harness attribution above is retained in the integration source
header and in this notice.

## No warranty

DeepSeek Harness is a developer-preview project and is provided under the MIT
license without warranty. DgxayCode does not relicense DeepSeek Harness or
represent it as part of DgxayCode's GPL-covered source.
