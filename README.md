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

Or configure them in-app via the settings panel.

### Using Ollama

openwork can use local Ollama models without an API key.

```bash
# Install and start Ollama
ollama serve

# Pull at least one local model
ollama pull llama3.1:8b

# Optional: point openwork at a non-default Ollama server
export OLLAMA_BASE_URL=http://127.0.0.1:11434

# OLLAMA_HOST also works, including host:port values like 127.0.0.1:11434
export OLLAMA_HOST=127.0.0.1:11434
```

If you need the setting to persist for the app, add `OLLAMA_BASE_URL=...` or `OLLAMA_HOST=...` to `~/.openwork/.env`.

## Supported Models

| Provider  | Models                                                                                 |
| --------- | -------------------------------------------------------------------------------------- |
| Anthropic | Claude Opus 4.5, Claude Sonnet 4.5, Claude Haiku 4.5, Claude Opus 4.1, Claude Sonnet 4 |
| OpenAI    | GPT-5.2, GPT-5.1, o3, o3 Mini, o4 Mini, o1, GPT-4.1, GPT-4o                            |
| Google    | Gemini 3 Pro Preview, Gemini 3 Flash Preview, Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 2.5 Flash Lite |
| Ollama    | Any local Ollama chat model returned by your Ollama server, such as llama3.1:8b or qwen3:14b |

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Report bugs via [GitHub Issues](https://github.com/langchain-ai/openwork/issues).

## License

MIT — see [LICENSE](LICENSE) for details.
