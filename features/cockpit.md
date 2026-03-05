# Cockpit

A workspace-scoped kanban view for monitoring DAG runs across dates.

The Cockpit page is available at `/cockpit` in the Web UI. It requires the agent feature to be enabled (`config.agentEnabled`).

## Page Layout

The page has two areas:
1. **Toolbar** — workspace selector, template selector
2. **Kanban board** — DAG runs grouped by date, split into status columns

If no workspace is selected, the page shows a placeholder prompting you to select or create one.

## Workspace Selector

A dropdown listing all workspaces by name. Selecting a workspace filters the kanban to show only DAG runs tagged with `workspace=<name>`.

- **"All workspaces"** — deselects the workspace filter
- **"New workspace"** — opens an inline text input (only visible if you have write permission)
- **Delete** — trash icon next to the selected workspace, opens a confirmation dialog

On first load, if no workspaces exist, a workspace named `default` is auto-created.

Workspace names are sanitized to `[a-zA-Z0-9_-]` on creation.

See [Workspaces](/features/workspaces) for the API and storage details.

## Template Selector

Opens a dropdown to browse and select a DAG definition. Selecting a DAG opens the preview modal.

- **Search** — text input with 300ms debounce, queries `GET /api/v1/dags` with `name` filter
- **Tag filter** — clickable tag badges below the search input; tags with `workspace=` prefix are hidden from the filter row
- **Grouping** — DAGs are grouped by their `group` field; ungrouped DAGs appear last
- **Workspace filtering** — DAGs with a `workspace=X` tag that doesn't match the selected workspace are excluded
- **Results** — up to 50 DAGs returned per query
- **Keyboard** — Arrow keys to navigate, Enter to select, Escape to close

Each item shows:
- DAG name (red if it has load errors)
- Description (truncated)
- First 3 tags as badges, with `+N` overflow indicator
- Parameter count (e.g., `3p`)

## Kanban Board

DAG runs for each date are grouped into four columns:

| Column | Statuses |
|--------|----------|
| Queued | `queued`, `not_started` |
| Running | `running` |
| Done | `success`, `partial_success` |
| Failed | `failed`, `aborted`, `rejected` |

### Date Sections

- **Initial load** — today and yesterday
- **Infinite scroll** — scrolling to the bottom loads the previous day, up to 30 days back
- **Real-time updates** — today's section uses Server-Sent Events (SSE) for live updates; past dates use a single REST fetch with no polling
- **Reset** — switching workspaces resets to today + yesterday

### Kanban Cards

Each card displays:

| Field | Description |
|-------|-------------|
| Name | DAG run name, truncated |
| Status | Color-coded status chip |
| Elapsed time | Formatted as `Xs`, `Xm Ys`, or `Xh Ym`. For running cards, updates every 1 second. |
| Parameters | First 60 characters, monospace font |

Clicking a card opens the DAG Run Details modal.

Cards animate in/out using Framer Motion layout animations.

## DAG Preview Modal

Opens as a side panel from the right edge, covering 3/4 of the viewport (full width on mobile).

The modal shows the full DAG details view (same as `/dags/{fileName}/spec`) with real-time SSE updates.

### Enqueue Behavior

When enqueueing a DAG from the preview modal, the workspace tag `workspace=<name>` is injected into the DAG spec before submission. This uses the `POST /api/v1/dag-runs/enqueue` endpoint with the modified spec.

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Esc` | Close the modal |
| `F` | Open the DAG in fullscreen view |
| `Cmd/Ctrl + Click` on fullscreen button | Open in new tab |

## Data Flow

```
Workspace selected
  → Tag filter: workspace=<name>
  → GET /api/v1/dag-runs?tags=workspace%3D<name>&fromDate=...&toDate=...
  → Group by status → Kanban columns
```

For today's date, SSE replaces polling:
```
SSE /api/v1/events/dag-runs?tags=workspace%3D<name>&fromDate=...&toDate=...
```
