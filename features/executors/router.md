# Router

Route execution to different steps based on pattern matching against a value. This enables conditional branching in workflows where different code paths execute depending on runtime values.

::: warning Important
Router steps require `type: graph` at the DAG level. Routers are inherently about branching, which is a graph concept. Using `type: chain` (the default) with router steps will result in a validation error.
:::

## Basic Usage

Use the `router` step type to evaluate a value and route execution to matching target steps:

```yaml
type: graph
env:
  - INPUT: exact_value
steps:
  - id: router
    type: router
    value: ${INPUT}
    routes:
      "exact_value": [route_a]
      "other": [route_b]

  - id: route_a
    command: echo "Route A executed"
    output: RESULT_A

  - id: route_b
    command: echo "Route B executed"
    output: RESULT_B
```

When `INPUT=exact_value`, only `route_a` executes. The `route_b` step is skipped.

## Pattern Matching

### Exact Match

Match literal string values:

```yaml
type: graph
env:
  - STATUS: production
steps:
  - id: router
    type: router
    value: ${STATUS}
    routes:
      "production": [prod_handler]
      "staging": [staging_handler]

  - id: prod_handler
    command: echo "Production"
    output: ENV

  - id: staging_handler
    command: echo "Staging"
    output: ENV
```

### Regex Match

Prefix patterns with `re:` to use Go regular expression syntax:

```yaml
type: graph
env:
  - INPUT: apple_pie
steps:
  - id: router
    type: router
    value: ${INPUT}
    routes:
      "re:^apple.*": [route_a]
      "re:^banana.*": [route_b]

  - id: route_a
    command: echo "Apple route"
    output: RESULT_A

  - id: route_b
    command: echo "Banana route"
    output: RESULT_B
```

When `INPUT=apple_pie`, the regex `^apple.*` matches, so `route_a` executes.

### Multiple Patterns Matching

When multiple patterns match the same value, **all matching routes execute**:

```yaml
type: graph
env:
  - INPUT: success_code
steps:
  - id: router
    type: router
    value: ${INPUT}
    routes:
      "re:^success.*": [handle_success]
      "re:.*_code$": [handle_code]
      "re:.*": [catch_all]

  - id: handle_success
    command: echo "Success handler"
    output: SUCCESS

  - id: handle_code
    command: echo "Code handler"
    output: CODE

  - id: catch_all
    command: echo "Catch all"
    output: CATCH_ALL
```

With `INPUT=success_code`, all three patterns match, so all three handlers execute.

### Catch-All Pattern

Use `re:.*` to create a default route that matches any value:

```yaml
type: graph
env:
  - INPUT: unknown_value
steps:
  - id: router
    type: router
    value: ${INPUT}
    routes:
      "specific": [route_a]
      "re:.*": [default_route]

  - id: route_a
    command: echo "Specific route"
    output: RESULT_A

  - id: default_route
    command: echo "Default route"
    output: RESULT_DEFAULT
```

When no specific pattern matches, the catch-all `re:.*` ensures `default_route` executes.

## Multiple Targets Per Route

A single route can trigger multiple steps by specifying an array of target names:

```yaml
type: graph
env:
  - INPUT: trigger
steps:
  - id: router
    type: router
    value: ${INPUT}
    routes:
      "trigger": [step_a, step_b]

  - id: step_a
    command: echo "Step A"
    output: RESULT_A

  - id: step_b
    command: echo "Step B"
    output: RESULT_B

  - id: step_c
    command: echo "Step C"
    output: RESULT_C
    depends:
      - step_a
```

When `INPUT=trigger`, both `step_a` and `step_b` execute. Steps can still depend on routed targets (`step_c` depends on `step_a`).

## Routing Based on Step Output

Route based on the output of a previous step:

```yaml
type: graph
steps:
  - id: check_status
    command: echo "success"
    output: STATUS

  - id: router
    type: router
    value: ${STATUS}
    routes:
      "success": [success_handler]
      "failure": [failure_handler]
    depends: [check_status]

  - id: success_handler
    command: echo "Handling success"
    output: RESULT

  - id: failure_handler
    command: echo "Handling failure"
    output: RESULT
```

The router evaluates `${STATUS}` after `check_status` completes, routing to the appropriate handler.

## Chained Routers

Routers can be chained for multi-level decision trees:

```yaml
type: graph
env:
  - CATEGORY: electronics
  - SUBCATEGORY: phone
steps:
  - id: category_router
    type: router
    value: ${CATEGORY}
    routes:
      "electronics": [electronics_router]
      "clothing": [clothing_handler]

  - id: electronics_router
    type: router
    value: ${SUBCATEGORY}
    routes:
      "phone": [phone_handler]
      "laptop": [laptop_handler]

  - id: phone_handler
    command: echo "Phone"
    output: RESULT

  - id: laptop_handler
    command: echo "Laptop"
    output: RESULT

  - id: clothing_handler
    command: echo "Clothing"
    output: RESULT
```

With `CATEGORY=electronics` and `SUBCATEGORY=phone`, execution flows: `category_router` → `electronics_router` → `phone_handler`.

## Complex DAG Topology

Routers integrate with DAG dependencies for fan-out/fan-in patterns:

```yaml
type: graph
env:
  - TRIGGER: all
steps:
  - id: setup
    command: echo "Setup complete"
    output: SETUP

  - id: router
    type: router
    value: ${TRIGGER}
    routes:
      "all": [branch_a, branch_b, branch_c]
    depends: [setup]

  # Three parallel branches
  - id: branch_a
    command: echo "A:${SETUP}"
    output: OUT_A

  - id: branch_b
    command: echo "B:${SETUP}"
    output: OUT_B

  - id: branch_c
    command: echo "C:${SETUP}"
    output: OUT_C

  # Fan-in: aggregator waits for all branches
  - id: aggregator
    command: echo "Aggregated"
    output: AGGREGATED
    depends: [branch_a, branch_b, branch_c]

  - id: final
    command: echo "Final"
    output: FINAL
    depends: [aggregator]
```

This creates a diamond pattern: `setup` → `router` → (`branch_a`, `branch_b`, `branch_c`) → `aggregator` → `final`.

## Behavior Notes

- **Requires type: graph**: Router steps require `type: graph` at the DAG level. Routers are inherently about branching, which is a graph concept. Using `type: chain` (the default) with router steps will result in a validation error.
- **Router always succeeds**: The router step itself always completes successfully. Routing is implemented via precondition injection into target steps.
- **Automatic dependency injection**: Target steps automatically depend on their router. You don't need to explicitly add `depends: [router]` to target steps—the router is injected as a dependency during DAG loading. This ensures target steps wait for the router to complete before evaluating their routing conditions.
- **Skipped steps**: When no pattern matches a target step, that step receives status `Skipped`.
- **Unique targets**: Each step can only be targeted by ONE route. Targeting the same step from multiple routes causes a validation error:

```yaml
# INVALID - process_a is targeted by multiple routes
type: graph
steps:
  - id: router
    type: router
    value: ${MODE}
    routes:
      "full": [process_a, process_b]
      "minimal": [process_a]  # Error: process_a already targeted
```

## See Also

- [Control Flow](/writing-workflows/control-flow) - Conditional execution and branching
- [Data Flow](/features/data-flow) - Passing data between steps
- [Step Types Reference](/reference/executors) - All available step types
