# Proxy/Gateway Configuration

OpenWork now supports custom base URLs for API providers, allowing you to route requests through internal gateways or proxy servers.

## Configuration

Base URLs are stored in the `~/.openwork/.env` file alongside API keys.

### Setting Base URLs via Environment Variables

You can configure custom base URLs by setting environment variables:

```bash
# Anthropic custom base URL
ANTHROPIC_BASE_URL=https://your-proxy.example.com/anthropic

# OpenAI custom base URL
OPENAI_BASE_URL=https://your-proxy.example.com/openai

# Google custom base URL
GOOGLE_BASE_URL=https://your-proxy.example.com/google
```

### Setting Base URLs via API

You can also configure base URLs programmatically through the IPC API:

```typescript
// Set a custom base URL
await window.api.models.setBaseUrl('anthropic', 'https://your-proxy.example.com/anthropic')

// Get the current base URL
const baseUrl = await window.api.models.getBaseUrl('anthropic')

// Remove a custom base URL (revert to default)
await window.api.models.deleteBaseUrl('anthropic')
```

## How It Works

When a base URL is configured for a provider:

1. **Anthropic (Claude)**: Uses `clientOptions.baseURL`
2. **OpenAI (GPT)**: Uses `configuration.baseURL`
3. **Google (Gemini)**: Uses `baseUrl` configuration option

The application will automatically use the custom base URL when making API calls, allowing you to:

- Route requests through internal API gateways
- Use proxy servers for compliance/security
- Implement custom rate limiting or caching layers
- Test against local/staging endpoints

## Example Use Case

If you have an internal API gateway at `https://ai-gateway.company.com`:

```bash
# In ~/.openwork/.env
ANTHROPIC_API_KEY=sk-ant-your-key
ANTHROPIC_BASE_URL=https://ai-gateway.company.com/anthropic

OPENAI_API_KEY=sk-your-openai-key
OPENAI_BASE_URL=https://ai-gateway.company.com/openai
```

All API requests will now be routed through your gateway while still using the official provider SDKs.

## Storage Location

Base URLs and API keys are stored in:
- **Location**: `~/.openwork/.env`
- **Format**: Standard environment variable format
- **Security**: File-based storage (ensure proper file permissions)

## Notes

- Base URLs are optional - if not set, requests go directly to provider APIs
- Custom base URLs can be set per-provider independently
- Changes take effect immediately for new agent sessions
- The `.env` file is created automatically in the `.openwork` directory in your home folder
