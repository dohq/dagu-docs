# GitHub Integration Examples

This page shows two practical agentic workflows.

## PR Code Review

Use this when someone should be able to ask Dagu to review a pull request from GitHub.

This example posts the review result back to the PR conversation thread.

### Binding

- `trigger_type`: `comment_command`
- `command_alias`: `review`
- `check_name`: `Dagu Review`

### Trigger

Post a PR comment or PR review comment such as:

```text
@dagucloud review
```

### Workflow

```yaml
secrets:
  - name: GH_TOKEN
    provider: env
    key: GH_TOKEN

harness:
  provider: codex

steps:
  - id: review
    type: harness
    output: REVIEW_BODY
    command: >
      Review pull request #${GITHUB_PR_NUMBER} in ${GITHUB_REPOSITORY}.
      Use commit ${GITHUB_SHA} as the review target.
      Comment text:
      ${WEBHOOK_PAYLOAD.comment.body}

  - id: post-review
    command: |
      gh api "repos/${GITHUB_REPOSITORY}/issues/${GITHUB_PR_NUMBER}/comments" \
        -f body="${REVIEW_BODY}"
```

## Answer a GitHub Question

Use this when someone should be able to ask a question from an issue or PR thread and have Dagu run an answering workflow.

This example posts the answer back to the same GitHub thread.

### Binding

- `trigger_type`: `comment_command`
- `command_alias`: `answer`

### Trigger

Post a comment such as:

```text
@dagucloud answer
Why is this failing in production?
```

### Workflow

```yaml
secrets:
  - name: GH_TOKEN
    provider: env
    key: GH_TOKEN

harness:
  provider: codex

steps:
  - id: answer
    type: harness
    output: ANSWER_BODY
    command: >
      Answer the GitHub thread question in ${GITHUB_REPOSITORY}.
      Issue number: ${GITHUB_ISSUE_NUMBER}.
      PR number: ${GITHUB_PR_NUMBER}.
      Full comment:
      ${WEBHOOK_PAYLOAD.comment.body}

  - id: post-answer
    command: |
      gh api "repos/${GITHUB_REPOSITORY}/issues/${GITHUB_ISSUE_NUMBER}/comments" \
        -f body="${ANSWER_BODY}"
```

## Related Pages

- [GitHub Integration](/github-integration/)
- [Setup](/github-integration/setup)
