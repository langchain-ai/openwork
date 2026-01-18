# openwork

[![npm][npm-badge]][npm-url] [![License: MIT][license-badge]][license-url]

[npm-badge]: https://img.shields.io/npm/v/openwork.svg
[npm-url]: https://www.npmjs.com/package/openwork
[license-badge]: https://img.shields.io/badge/License-MIT-yellow.svg
[license-url]: https://opensource.org/licenses/MIT

A desktop interface for [deepagentsjs](https://github.com/langchain-ai/deepagentsjs) — an opinionated harness for building deep agents with filesystem capabilities planning, and subagent delegation.

![openwork screenshot](docs/screenshot.png)

> [!CAUTION]
> openwork gives AI agents direct access to your filesystem and the ability to execute shell commands. Always review tool calls before approving them, and only run in workspaces you trust.

## Get Started

```bash
# Run directly with npx
npx openwork

# Or install globally
npm install -g openwork
openwork
```

Requires Node.js 18+.

### From Source

```bash
git clone https://github.com/langchain-ai/openwork.git
cd openwork
npm install
npm run dev
```

## Supported Models

Currently we configure the below provider and models. You can add your own providers and models by configuring them with the
provider/model select button below the UI's chat input box.

| Provider  | Models                                                                                 |
| --------- | -------------------------------------------------------------------------------------- |
| Anthropic | Claude Opus 4.5, Claude Sonnet 4.5, Claude Haiku 4.5, Claude Opus 4.1, Claude Sonnet 4 |
| OpenAI    | GPT-5.2, GPT-5.1, o3, o3 Mini, o4 Mini, o1, GPT-4.1, GPT-4o                            |
| Google    | Gemini 3 Pro Preview, Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 2.5 Flash Lite          |

## Configuration

### API Keys

Configure API keys using one of these methods:

**In-App (Recommended):**

1. Open the Model Switcher (bottom left of chat)
2. Click a provider → "Configure API Key"
3. Enter your API key and save

**Settings Dialog:**

1. Click the gear icon to open Settings
2. Enter API keys for each provider

**Environment Variables:**

You can also set environment variables directly. Keys are stored in `~/.openwork/.env`.

| Provider  | Environment Variable |
| --------- | -------------------- |
| Anthropic | `ANTHROPIC_API_KEY`  |
| OpenAI    | `OPENAI_API_KEY`     |
| Google    | `GOOGLE_API_KEY`     |

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Report bugs via [GitHub Issues](https://github.com/langchain-ai/openwork/issues).

## License

MIT — see [LICENSE](LICENSE) for details.
