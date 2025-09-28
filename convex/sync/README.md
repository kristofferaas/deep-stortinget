# Sync Workflow

## TL;DR

- Fetch parties, cases, and votes from `data.stortinget.no`
- Store normalized documents in `parties`, `cases`, and `votes` tables
- Track progress in the `sync` table via `updateStatus`
- Kick things off with the `startWorkflow` internal action

## Architecture Overview

The sync pipeline leans on `@convex-dev/workflow` and `@convex-dev/workpool` to serialize runs and to coordinate long running I/O.

```mermaid
flowchart TD
    A[startWorkflow] --> B(syncStortingetWorkflow handler)
    B --> C(updateStatus: started)
    C --> D(syncParties)
    D --> E(syncCases)
    E --> F(syncVotesForCase x N)
    F --> G(handleWorkflowComplete)
    G --> H(updateStatus: success | error | canceled)
```

## Module Breakdown

### `workflow.ts`

- Instantiates a `WorkflowManager` that allows only one sync run at a time.
- `syncStortingetWorkflow` orchestrates the high-level steps:
  - `updateStatus` to mark the run as `started`
  - `syncParties` (action) to pull latest party metadata
  - `syncCases` (action) to ingest cases and return their IDs
  - Fan-out `syncVotesForCase` actions in parallel for each case ID
- `startWorkflow` triggers the workflow with an `onComplete` callback.
- `handleWorkflowComplete` updates status documents depending on the result, cleaning up on success.
- `updateStatus` reads or writes the singleton `sync` record (indexed by `key = "stortinget_sync"`) and manages timestamps.
- `getSyncStatus` exposes the latest status via a Convex query.

### `parties.ts`

- Fetches `/eksport/partier` from the Stortinget API.
- Validates responses with Zod (`partyResponseSchema`) before stripping metadata.
- `upsertParties` inserts new parties; existing rows are left unchanged.

### `cases.ts`

- Fetches `/eksport/saker` and parses with `caseResponseSchema`.
- `upsertCases` either inserts new cases or replaces rows when `sist_oppdatert_dato` changes.
- Returns the list of case IDs that need vote refreshes.

### `votes.ts`

- Fetches `/eksport/voteringer?sakid=…` for each case.
- Uses `voteResponseSchema` to normalize and converts Microsoft JSON dates to ISO strings.
- `insertVotes` inserts only missing votes, ensuring idempotency.

### `helpers.ts`

- Shared Zod schemas for the Stortinget payloads.
- `parseMicrosoftJsonDate` converts `/Date(…)/` values into ISO-8601 strings.
- Utility `stripStortingetDtoMetadata` removes transport metadata (`versjon`, `respons_dato_tid`).

### `validators.ts`

- Convex validators mirroring the normalized shapes for `parties`, `cases`, `votes`, hearings, and sync status rows.

## Status Lifecycle

The `sync` table reflects one row per sync target (`key = "stortinget_sync"`).

| Status     | Meaning                                                  | Side effects                               |
| ---------- | -------------------------------------------------------- | ------------------------------------------ |
| `idle`     | No run in progress                                       | Leaves timestamps alone                    |
| `started`  | Workflow triggered; resets `startedAt` and clears finish | `startedAt = now`                          |
| `success`  | Workflow finished without errors                         | `finishedAt = now`                         |
| `error`    | Workflow failed                                          | `finishedAt = now`, `message` optional     |
| `canceled` | Workflow canceled                                        | `finishedAt = now`, `message = "Canceled"` |

`handleWorkflowComplete` applies the appropriate status based on the workflow result and avoids cleanup on failure so that runs can be inspected.

## Configuration & Env Vars

- `STORTINGET_BASE_URL` (optional): override the default `https://data.stortinget.no` host. Useful for testing against fixtures or mirrors.

## How to Kick Off a Sync

1. Call the internal action `internal.sync.workflow.startWorkflow`.
2. Inspect progress via `internal.sync.workflow.getSyncStatus` or a client query hitting that endpoint.
3. Check logs or stored messages if `status = "error"`.

The workflow runner enforces single concurrency, so repeated kicks while a job is `started` are queued and only one will run at a time.

## Extending the Pipeline

- Add new fetchers as internal actions that return a minimal payload (IDs or documents).
- Keep mutations idempotent: only insert missing documents or replace when the upstream `sist_oppdatert_dato` changes.
- Expand `SyncStatus` if you need richer progress reporting (e.g., counts, phase names).
