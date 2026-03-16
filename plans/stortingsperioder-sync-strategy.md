# Stortingsperioder Sync Strategy

## Status

No solution has been decided yet.

## Problem

We currently have logic for syncing Stortinget periods from the Stortinget API, and the current implementation used a daily cron job.

That schedule is wasteful because `stortingsperioder` changes very rarely. The active period already includes an end date, so polling every day does unnecessary work for long stretches of time.

## Open Design Question

We need a smarter way to trigger the next sync based on the current period metadata instead of relying on a fixed daily schedule.

Possible directions have been discussed, but none are approved yet:

- Scheduling a one-off sync based on the current period end date.
- Using a short-lived workflow around the rollover window.
- Keeping a low-frequency fallback repair job.

## Constraint

For now, syncing will be triggered manually. This note exists only to capture the problem and revisit the design later.
