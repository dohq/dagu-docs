# Workspaces

Organize DAG runs into named groups using tag-based filtering.

## How It Works

A workspace is a named entity stored on the server. When a DAG run is enqueued from the Cockpit UI, a `workspace=<name>` tag is injected into the DAG spec. The Cockpit then filters DAG runs by this tag, showing only runs belonging to the selected workspace.

Workspaces do not modify DAG definitions on disk. The tag injection happens at enqueue time on the in-memory spec copy.

## Configuration

Workspace data is stored as JSON files on the filesystem.

```yaml
# ~/.config/dagu/config.yaml
paths:
  workspaces_dir: "/custom/path/to/workspaces"
```

| Setting | Environment Variable | Default |
|---------|---------------------|---------|
| `paths.workspaces_dir` | `DAGU_WORKSPACES_DIR` | `{data_dir}/workspaces` |

The default `data_dir` depends on your setup:
- With `DAGU_HOME`: `{DAGU_HOME}/data`
- XDG fallback: `~/.local/share/dagu/data`

Each workspace is stored as `{workspaces_dir}/{uuid}.json`:

```json
{
  "id": "a1b2c3d4-...",
  "name": "production",
  "description": "Production workflows",
  "created_at": "2026-03-06T10:00:00Z",
  "updated_at": "2026-03-06T10:00:00Z"
}
```

## Name Constraints

Workspace names must match `[a-zA-Z0-9_-]`. The UI strips any other characters on creation.

## REST API

All endpoints accept the `remoteNode` query parameter.

### List Workspaces

```
GET /api/v1/workspaces
```

No authentication required.

**Response (200)**:
```json
{
  "workspaces": [
    {
      "id": "a1b2c3d4-...",
      "name": "production",
      "description": "Production workflows",
      "createdAt": "2026-03-06T10:00:00Z",
      "updatedAt": "2026-03-06T10:00:00Z"
    }
  ]
}
```

Returns an empty array if no workspaces exist.

### Create Workspace

```
POST /api/v1/workspaces
```

Requires **developer** role or above.

**Request**:
```json
{
  "name": "staging",
  "description": "Optional description"
}
```

`name` is required. `description` is optional.

**Response (201)**: The created `WorkspaceResponse` object.

**Response (400)**: Name is empty.
```json
{ "code": "bad_request", "message": "Name is required" }
```

**Response (409)**: A workspace with this name already exists.
```json
{ "code": "already_exists", "message": "Workspace with this name already exists" }
```

### Get Workspace

```
GET /api/v1/workspaces/{workspaceId}
```

No authentication required.

**Response (200)**: The `WorkspaceResponse` object.

**Response (404)**: Workspace not found.

### Update Workspace

```
PATCH /api/v1/workspaces/{workspaceId}
```

Requires **developer** role or above. PATCH semantics — only provided fields are updated.

**Request**:
```json
{
  "name": "new-name",
  "description": "Updated description"
}
```

Both fields are optional. Empty string for `name` is ignored.

**Response (200)**: The updated `WorkspaceResponse` object.

**Response (404)**: Workspace not found.

**Response (409)**: Another workspace with the new name already exists.

### Delete Workspace

```
DELETE /api/v1/workspaces/{workspaceId}
```

Requires **developer** role or above.

**Response (204)**: No content. Workspace deleted.

**Response (404)**: Workspace not found.

### Response Object

All endpoints returning workspace data use this shape:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | UUID |
| `name` | string | Yes | Workspace name |
| `description` | string | No | Optional description |
| `createdAt` | string (date-time) | No | UTC creation timestamp |
| `updatedAt` | string (date-time) | No | UTC last-update timestamp |

## Audit Logging

All write operations are logged with category `workspace`:

| Action | Details |
|--------|---------|
| `workspace_create` | `{id, name}` |
| `workspace_update` | `{id, name}` |
| `workspace_delete` | `{id, name}` |

## Related

- [Cockpit](/features/cockpit) — the UI that uses workspaces
- [Tags](/features/tags) — workspaces use `workspace=<name>` tags for filtering
