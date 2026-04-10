# Custom Step Types

`step_types` defines reusable step types that expand to builtin-backed steps when a DAG is loaded. They are resolved during spec build, before normal step validation and execution. The runtime executes the expanded builtin step.

## Where You Can Declare Them

- At the top level of a DAG document.
- In `base.yaml`.
- Base-config and DAG-local definitions are merged per YAML document.
- A DAG-local definition that duplicates a base-config name is rejected.
- A DAG-local definition is visible only inside the YAML document that declares it. Another document separated by `---` must redeclare it or inherit it from base config.

## Definition Format

```yaml
step_types:
  greet:
    type: command
    description: Print a greeting
    input_schema:
      type: object
      additionalProperties: false
      required: [message]
      properties:
        message:
          type: string
        repeat:
          type: integer
          default: 2
    template:
      exec:
        command: /bin/echo
        args:
          - {$input: message}
          - {$input: repeat}

steps:
  - type: greet
    config:
      message: hello
```

This expands to a builtin `command` step at load time. `config.repeat` defaults to `2`, so the step runs `/bin/echo hello 2`. If `name` is omitted, the generated name uses the custom type prefix, such as `greet_1`.

## Definition Fields

- `step_types.<name>` must match `^[A-Za-z][A-Za-z0-9_-]*$`.
- Custom names cannot reuse builtin step type names such as `command`, `http`, `kubernetes`, `s3`, `chat`, or `agent`.
- `type` is required and must point to a builtin step type or builtin alias. Custom step types cannot target other custom step types.
- `input_schema` is required. It must be an inline JSON Schema object that resolves to an object schema.
- `template` is required. It must be a step fragment object.
- `template.type` is rejected. The expanded builtin type always comes from `step_types.<name>.type`.
- `description` is optional. It is applied only when the expanded step does not set its own description.

## Template Rendering

String values inside `template` are rendered with Go `text/template` using `.input` as the template data.

```yaml
step_types:
  webhook:
    type: http
    input_schema:
      type: object
      additionalProperties: false
      required: [url, text]
      properties:
        url:
          type: string
        text:
          type: string
    template:
      command: POST {{ .input.url }}
      config:
        headers:
          Content-Type: application/json
        body: |
          {"text": {{ json .input.text }}}
```

Rules:

- Missing template keys are errors.
- The only built-in helper is `json`.
- `config` is validated first, then schema defaults are applied, then the template is rendered.
- Use `{$input: path.to.value}` for typed injection without string conversion.

```yaml
template:
  exec:
    command: /bin/echo
    args:
      - {$input: message}
      - {$input: repeat}
```

`$input` path resolution supports dotted object fields and numeric array indexes such as `items.0.name`.

## Call-Site Fields

When a step uses a custom type, `config` is input to the custom definition. It is not merged directly into builtin executor config.

Allowed call-site fields:
`name`, `id`, `description`, `depends`, `continue_on`, `retry_policy`, `repeat_policy`, `mail_on_error`, `preconditions`, `signal_on_stop`, `env`, `timeout_sec`, `stdout`, `stderr`, `log_output`, `worker_selector`, `output`, `approval`.

Rejected call-site fields:
`command`, `exec`, `script`, `shell`, `shell_packages`, `working_dir`, `call`, `params`, `parallel`, `container`, `llm`, `messages`, `agent`, `value`, `routes`.

If you need one of the rejected fields, put it in `template`.

## Base Config Example

`base.yaml`

```yaml
step_types:
  greet:
    type: command
    input_schema:
      type: object
      additionalProperties: false
      required: [message]
      properties:
        message:
          type: string
    template:
      exec:
        command: /bin/echo
        args:
          - {$input: message}
```

`hello.yaml`

```yaml
steps:
  - type: greet
    config:
      message: hello from base
```

Every DAG loaded with that base config can use `type: greet`.

## Handlers

Custom step types can be used in `steps` and in `handler_on`.

```yaml
step_types:
  notify:
    type: http
    input_schema:
      type: object
      additionalProperties: false
      required: [url, text]
      properties:
        url:
          type: string
        text:
          type: string
    template:
      command: POST {{ .input.url }}
      config:
        headers:
          Content-Type: application/json
        body: |
          {"text": {{ json .input.text }}}

handler_on:
  success:
    type: notify
    config:
      url: https://hooks.example.com/workflow
      text: completed
```

## Direct Exec

Use `exec` when you want explicit argv with no shell parsing.

```yaml
steps:
  - exec:
      command: /usr/bin/python3
      args:
        - -u
        - script.py
        - --limit
        - 10
```

`exec` is a normal step field, so custom step templates can use it too. It is mutually exclusive with `command` and `script`, and it cannot be combined with `shell` or `shell_packages`.

## Related

- [YAML Specification](/writing-workflows/yaml-specification)
- [Base Configuration](/server-admin/base-config)
- [Shell](/step-types/shell)
