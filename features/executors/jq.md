# JQ

Process and transform JSON data using jq.

## Basic Usage

```yaml
steps:
  - id: extract_field
    type: jq
    command: '.name'
    script: |
      {"name": "John Doe", "age": 30, "city": "New York"}
```

Output: `"John Doe"`

## Configuration

### Raw Output

By default, results are returned as pretty-printed JSON. Enable raw output
when you need jq's `-r` behavior (unquoted strings, numbers, booleans).

```yaml
steps:
  - id: list_addresses
    type: jq
    config:
      raw: true
    command: '.users[].email'
    script: |
      {
        "users": [
          {"email": "alice@example.com"},
          {"email": "bob@example.com"}
        ]
      }
```

Output:
```text
alice@example.com
bob@example.com
```

## Examples

### Transform Objects

```yaml
steps:
  - id: transform
    type: jq
    command: '{id: .user_id, name: (.first + " " + .last)}'
    script: |
      {"user_id": 123, "first": "John", "last": "Doe"}
```

### Filter Arrays

```yaml
steps:
  - id: filter_active
    type: jq
    command: '.users[] | select(.active) | .email'
    script: |
      {
        "users": [
          {"email": "alice@example.com", "active": true},
          {"email": "bob@example.com", "active": false},
          {"email": "carol@example.com", "active": true}
        ]
      }
```

### Process API Response

```yaml
steps:
  - id: fetch_data
    type: http
    config:
      silent: true
    command: GET https://api.example.com/products
    output: API_RESPONSE

  - id: extract_in_stock
    type: jq
    command: '.products | map(select(.inventory > 0) | {id, name, price})'
    script: ${API_RESPONSE}
    output: IN_STOCK
```

### Aggregate Data

```yaml
steps:
  - id: sales_by_category
    type: jq
    command: |
      group_by(.category) |
      map({
        category: .[0].category,
        total: map(.amount) | add,
        count: length
      })
    script: |
      [
        {"category": "Electronics", "amount": 299.99},
        {"category": "Clothing", "amount": 49.99},
        {"category": "Electronics", "amount": 199.99}
      ]
```
