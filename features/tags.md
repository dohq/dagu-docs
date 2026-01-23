# Tags

Categorize and filter DAGs using tags.

## Overview

Tags support key-value pairs (`env=prod`) and simple labels (`critical`). Values are normalized to lowercase.

## YAML Formats

All formats below are equivalent:

```yaml
# String: space-separated key=value
tags: "env=prod team=platform"

# String: comma-separated (simple tags)
tags: "production, critical, batch"

# Map notation
tags:
  env: prod
  team: platform

# Array of strings
tags:
  - env=prod
  - team=platform
  - critical

# Array of maps
tags:
  - env: prod
  - team: platform

# Mixed array
tags:
  - env=prod
  - critical
  - team: platform
```

## API Filtering

Filter DAGs and runs using the `tags` query parameter.

### Filter Syntax

| Syntax | Description |
|--------|-------------|
| `key` | Match any DAG with this key (any value) |
| `key=value` | Match exact key-value pair |
| `!key` | Match DAGs WITHOUT this key |

Multiple filters use AND logic.

### Examples

```bash
# DAGs with "env" key (any value)
GET /api/v2/dags?tags=env

# DAGs with env=prod
GET /api/v2/dags?tags=env=prod

# DAGs with env=prod AND team key
GET /api/v2/dags?tags=env=prod,team

# DAGs without "deprecated" key
GET /api/v2/dags?tags=!deprecated

# Combined: env=prod AND has team AND not deprecated
GET /api/v2/dags?tags=env=prod,team,!deprecated
```

### CLI

```bash
# List DAGs with tag filter
dagu list --tags env=prod

# Start a run with tag filter
dagu start workflow.yaml --tags team=platform
```

## UI

The tag search input accepts the same filter syntax. Type `env=prod` or `!deprecated` to filter the DAG list.
