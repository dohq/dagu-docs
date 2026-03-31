# Local AI

Use Dagu with local model servers such as Ollama, vLLM, LM Studio, or any other server that exposes an OpenAI-compatible chat completions API.

This page focuses on Dagu's current implementation, especially the details that matter when you use the Web UI agent or the `type: chat` step with local models.

## What Dagu Expects

Dagu's `local` provider is an OpenAI-compatible client.

- Default base URL: `http://localhost:11434/v1`
- Request path appended by Dagu: `/chat/completions`
- Final request URL shape: `<base_url>/chat/completions`

That means Dagu expects a local server that accepts OpenAI-style chat completions requests at a `v1` base URL. It does not send requests to vendor-native endpoints such as Ollama's `/api/generate`.

Both of these Dagu features use that same local-provider stack:

- The Web UI agent model configuration under `/agent-settings`
- Workflow chat steps using `type: chat`

For the Web UI path, see [Models & Providers](/features/agent/settings/models) alongside this page.

## Provider Names

### In Workflow YAML

For workflow chat steps, Dagu accepts these provider names for the local provider family:

- `local`
- `ollama`
- `vllm`
- `llama`

Example:

```yaml
steps:
  - id: ask-local-model
    type: chat
    llm:
      provider: local
      model: <your-model-tag>
    messages:
      - role: user
        content: "Hello!"
```

### In the Web UI Agent Settings

In the Web UI, choose `Local` from the provider dropdown. The UI stores a model config and the agent backend uses that config when it creates provider clients. See [Models & Providers](/features/agent/settings/models) for the settings-page behavior.

## Ollama: Use the OpenAI-Compatible Base URL

Ollama exposes both:

- Native Ollama endpoints such as `/api/generate`
- OpenAI-compatible endpoints under `/v1`, including `/v1/chat/completions`

Dagu uses the OpenAI-compatible path, not the native `/api/*` path.

### Correct and Incorrect Base URL Values

| Value entered in Dagu | Final request URL | Result |
|---|---|---|
| `http://localhost:11434/v1` | `http://localhost:11434/v1/chat/completions` | Correct |
| empty | `http://localhost:11434/v1/chat/completions` | Correct for Ollama on the same machine as the Dagu process |
| `http://localhost:11434/api/generate` | `http://localhost:11434/api/generate/chat/completions` | Wrong, usually `404` |
| `http://localhost:11434/v1/chat/completions` | `http://localhost:11434/v1/chat/completions/chat/completions` | Wrong |

::: warning Base URL Means Prefix, Not Full Endpoint
For local models, enter the base prefix only. Do not paste a full endpoint such as `/api/generate` or `/v1/chat/completions` into Dagu's `Base URL` field.
:::

## Ollama Setup for the Web UI Agent

### 1. Install and start Ollama

Follow the official Ollama docs for installation and startup:

- [Ollama Quickstart](https://docs.ollama.com/quickstart)

If you run Ollama manually rather than through its usual service management, start the server before using Dagu.

### 2. Pull a model in Ollama

Ollama requires the model to be present locally before Dagu can use it.

The official docs show pulling a model like this:

```bash
ollama pull llama3.2
```

Use any model tag you have installed locally.

### 3. Configure the model in Dagu

In `/agent-settings`:

- `Provider`: `Local`
- `Model`: the exact installed model tag from Ollama
- `Base URL`: leave empty or set `http://localhost:11434/v1`
- `API Key`: leave empty unless your proxy requires one

Example values:

- `Model`: `llama3.2`
- `Base URL`: `http://localhost:11434/v1`

### 4. Set it as the default agent model

After creating the model entry, click the star icon so the agent uses it by default.

## Workflow Setup with Local Models

### Minimal Example

```yaml
steps:
  - id: local-chat
    type: chat
    llm:
      provider: local
      model: <your-model-tag>
    messages:
      - role: user
        content: "Summarize this repository in one paragraph."
    output: RESULT
```

### Explicit Ollama Base URL

```yaml
steps:
  - id: local-chat
    type: chat
    llm:
      provider: local
      model: <your-model-tag>
      base_url: http://localhost:11434/v1
      max_tokens: 1024
      stream: true
    messages:
      - role: user
        content: "Generate a short changelog entry."
```

### YAML Alias Example

```yaml
steps:
  - id: local-chat
    type: chat
    llm:
      provider: ollama
      model: <your-model-tag>
```

The alias above is accepted in workflow YAML and resolves to the same local-provider implementation as `provider: local`.

## What Dagu Sends Today

For local models, Dagu currently builds standard OpenAI-style chat-completions requests. The local provider serializes these fields when present:

- `model`
- `messages`
- `stream`
- `temperature`
- `max_tokens`
- `top_p`
- `stop`
- `tools`
- `tool_choice`

This is enough for standard chat, streaming, and tool-calling against local servers that support those fields.

## What Dagu Does Not Send Today

Some local servers support more request fields than Dagu currently emits through its local provider.

### Not currently serialized by Dagu's local provider

- Provider-specific reasoning fields for local models
- OpenAI `responses` API requests
- Image parts / multimodal message content
- Vendor-native request fields such as Ollama's `/api/generate` `think` and `options`

Important implications:

- Ollama documents reasoning fields on `/v1/chat/completions` for thinking-capable models, but Dagu's local provider currently sends the standard chat-completions fields above and does not add Ollama/OpenAI reasoning parameters.
- Ollama documents native `/api/generate` options such as `think` and runtime `options`, but Dagu does not call `/api/generate`.
- Ollama's OpenAI-compatible docs include image and array-content message formats, but Dagu's current message abstraction is text-only for this path.
- Ollama also documents `/v1/responses`, but Dagu's local provider currently targets `/v1/chat/completions`.

## Agent Settings: Which Fields Affect Local Requests

For Web UI agent model settings, the fields do not all mean the same thing.

### `Base URL`

This affects the outbound request target. For local models, blank means Dagu falls back to `http://localhost:11434/v1`.

### `Context Window`

For the Web UI agent, this is Dagu-side metadata used for session compaction heuristics. It does not reconfigure Ollama's context size.

If you need a different context size with Ollama, configure that in Ollama itself. Ollama's OpenAI compatibility docs explicitly note that changing context size requires creating a model with a different `num_ctx` setting rather than sending an OpenAI chat field for context length.

### `Max Output Tokens`

For workflow `type: chat`, `llm.max_tokens` is forwarded to the provider request.

For the current Web UI agent path, the saved model config's `Max Output Tokens` value is metadata only. The current agent request path does not inject it into local-provider API calls.

### `Supports Thinking`

This is stored in the model configuration, but Dagu's current local-provider request builder does not serialize provider-specific thinking or reasoning fields for local models.

## Networking: What `localhost` Actually Means

Dagu sends local-model HTTP requests from the Dagu process that is executing the feature, not from your browser.

- Web UI agent: the request comes from the Dagu backend process
- `type: chat` workflow step: the request comes from the process executing that step

So if Dagu runs in Docker, Kubernetes, a VM, or on a remote node, `localhost:11434` refers to that environment, not your laptop unless Ollama is running there too.

## Troubleshooting

### `404` when using Ollama

The most common cause is using a full native Ollama endpoint as Dagu's base URL.

Use:

- `http://localhost:11434/v1`

Do not use:

- `http://localhost:11434/api/generate`
- `http://localhost:11434/v1/chat/completions`

### `model not found`

The model name in Dagu must match the model tag that exists in Ollama.

Examples:

- `llama3.2`
- `qwen3.5:latest`

If the tag differs, Dagu will still reach Ollama successfully, but Ollama will reject the request for the unknown model.

### The agent connects locally on my machine, but Dagu still cannot reach it

Check where Dagu is running.

If Dagu is inside Docker or Kubernetes, `localhost` may point at the container or pod rather than the host where Ollama is running.

### Thinking controls do not seem to change local-model behavior

That is expected with the current local-provider implementation. Dagu does not currently add local-provider reasoning fields to outbound requests.

### My workflow chat step honors `max_tokens`, but the Web UI agent model setting does not

That is also expected with the current code paths:

- Workflow chat steps forward `llm.max_tokens`
- The current Web UI agent runtime does not forward the saved model config's `Max Output Tokens`

## External References

- [Ollama OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility)
- [Ollama native `/api/generate` reference](https://docs.ollama.com/api/generate)
- [Ollama quickstart](https://docs.ollama.com/quickstart)

## See Also

- [Basic Chat](/features/chat/basics)
- [Agent](/features/agent/)
- [Models & Providers](/features/agent/settings/models)
- [AI Agent Getting Started](/getting-started/ai-agent)
