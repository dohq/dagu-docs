# Personality & Web Search

This page covers the parts of `/agent-settings` that shape how the built-in steward behaves by default.

## Default Profile

If profiles are configured, the settings page shows a **Default Profile** selector.

This selects the default personality for the built-in steward.

Use profiles when you want different default styles for different teams or jobs, such as concise operations help, support-oriented replies, or a stricter code-review voice.

In the current UI:

- The selector only appears when at least one profile exists
- You can choose `Default (no profile)` or a configured profile

See [Profiles](/features/agent/souls) for how to create and manage personalities.

## When the Selected Profile Is Used

The selected profile becomes the default for the built-in steward. Users can still override the profile in the chat UI for a message or session when that UI control is available.

## Web Search

The settings page includes a **Web Search** toggle.

This enables provider-native web search for agent sessions. It does not appear as a separate tool button in the built-in tool list.

Whether it actually works depends on the selected provider and model.

## Max Uses per Request

When web search is enabled, the current UI also shows **Max Uses per Request**.

Behavior:

- Empty means no UI-level limit is saved here
- Values below `1` are not kept by the UI

## Scope of This Setting

This setting controls the built-in steward configuration.

Workflow `type: agent` steps can also define their own `agent.web_search` settings in DAG YAML. Those are documented separately in [Agent Step](/features/agent/step).

## Important Distinction

Provider-native web search is different from exposing a generic "search the web" tool.

In Dagu's built-in steward:

- Web search runs through the selected model/provider
- Tool permissions do not show it as a standalone tool

## See Also

- [Steward Settings](/features/agent/settings/)
- [Profiles](/features/agent/souls)
- [Agent Step](/features/agent/step)
- [Models & Providers](/features/agent/settings/models)
