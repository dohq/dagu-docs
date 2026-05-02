# GitHub Integration Setup

::: info Deployment Model
This feature requires a **Dagu Pro self-host license** on the target Dagu server. See the [pricing page](https://dagu.sh/pricing) for current availability.
:::

## Before You Start

Make sure all of these are true:

- the Dagu GitHub App is installed on the target repository or organization
- the installation and repository appear in Dagu Cloud
- the target server has a Pro self-host license
- queues are enabled on that server
- the scheduler is running on that server
- that server already has the DAG you want to run

## Create a Binding

Every binding needs:

- `installation`
- `repository`
- `target license`
- `dag name`
- `trigger type`

Important:

- `target license` chooses **which server runs the DAG**
- `dag name` must match the DAG name on that server exactly

## Choose a Trigger Type

- `auto`: for `push`, `pull_request`, `create`, `release`, and `check_run`
- `comment_command`: for PR comments, issue comments, and PR review comments
- `manual_dispatch`: for `repository_dispatch` and `workflow_dispatch`

## Verify It Works

1. The GitHub installation appears in Dagu Cloud.
2. The repository is selectable.
3. The binding is created successfully.
4. The selected license points to the server you expect.
5. A matching GitHub event or comment starts a run on that server.
6. If `check_name` is set, GitHub shows the Dagu check.

## Common Problems

### Wrong license

The event matches, but the wrong server runs it or nothing happens.

Fix: choose the license for the server that actually has the DAG.

### Queues or scheduler not running

Dagu Cloud accepts the event, but no DAG starts.

Fix: enable queues and run the scheduler on the target server.

### Repository missing from the form

The installation exists, but the repository is not selectable.

Fix: install the GitHub App on that repository or resync the installation.
