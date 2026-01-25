# Tags

Categorize and filter DAGs and DAG runs using tags.

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

Filter DAGs and DAG runs using the `tags` query parameter.

### Filter Syntax

| Syntax | Description |
|--------|-------------|
| `key` | Match any item with this key (any value) |
| `key=value` | Match exact key-value pair |
| `!key` | Match items WITHOUT this key |

Multiple filters use AND logic.

### DAG Filtering

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

### DAG Runs Filtering

Filter runs from DAGs that have the specified tags:

```bash
# Runs from DAGs with "env" key
GET /api/v2/dag-runs?tags=env

# Runs from DAGs with env=prod
GET /api/v2/dag-runs?tags=env=prod

# Runs from DAGs with env=prod AND team key
GET /api/v2/dag-runs?tags=env=prod,team
```

## UI

The tag filter dropdown is available on both the DAG list and DAG runs pages. Select tags to filter; multiple tags use AND logic.
