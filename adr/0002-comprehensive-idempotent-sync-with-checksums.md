# Transition to Comprehensive Idempotent Sync with Checksum-Based Optimization

## Status

Accepted

## Context

The current synchronization workflow for Stortinget API data operates incrementally by:

1. Fetching all cases from the API
2. Comparing with the database and inserting only new cases
3. Fetching votes only for newly inserted cases
4. Fetching vote proposals only for newly inserted votes

This approach has several critical issues:

### Data Loss Problem

When a case already exists in the database but receives new votes, those votes are never synced because the case itself hasn't changed. This cascading problem means:

- Missed votes → missed vote proposals
- The database becomes increasingly stale over time
- No way to detect or recover from missing data

### Schema Evolution Problem

When modifying the workflow or adding new tables/fields, the only option is to delete all data and perform a full resync from scratch. This is problematic because:

- Loss of historical data during development iterations
- No ability to backfill missing data
- Difficult to test schema changes incrementally

### Update Logic Gaps

Current implementation only handles inserts, not updates:

- Votes are never updated if they change
- Vote proposals have a TODO comment acknowledging missing update logic
- Cases are replaced on `sist_oppdatert_dato` change, but this doesn't trigger vote/proposal syncs

### API Constraints

The Stortinget API provides no filtering capabilities:

- Cannot query by date ranges
- Cannot request only modified records
- Must fetch all-or-nothing for each resource type

Running full syncs on every execution would be prohibitively expensive with many API calls and database operations, especially since data rarely changes.

## Decision

Implement an **idempotent, comprehensive sync workflow** with **checksum-based change detection** that:

### 1. Always Sync All Entities from API

- Fetch all cases from API (already doing this)
- Sync votes for **ALL cases** in the database (not just new ones)
- Sync vote proposals for **ALL votes** (not just new ones)

This ensures complete data coverage and automatic backfilling of missing data.

### 2. Add Checksums for Efficient Change Detection

Add a `syncCache` table to store a SHA-256 hash of each sync entry for cheap lookups, with corresponding hash, table name, internal and external id.

**Checksum Computation:**

- Strip API metadata (`versjon`, `respons_dato_tid`) before hashing
- Use deterministic JSON serialization (sorted object keys)
- Compute SHA-256 hash of the normalized data
- Store hash in separate `syncCache` table

**Update Logic:**

```typescript
// 1. Check syncCache first (cheap index query - no full document read)
const cachedSync = await ctx.db
  .query("syncCache")
  .withIndex("by_table_and_external_id", (q) =>
    q.eq("table", "cases").eq("externalId", dto.id),
  )
  .unique();

if (cachedSync && cachedSync.checksum === dto.checksum) {
  // Checksum matches - skip (no database read or write!)
  continue;
}

if (!cachedSync) {
  // New record - insert both data and cache entry
  const caseId = await ctx.db.insert("cases", dto.data);
  await ctx.db.insert("syncCache", {
    table: "cases",
    externalId: dto.id,
    checksum: dto.checksum,
    internalId: caseId, // Cache the ID for future updates
  });
} else {
  // Checksum changed - update using cached internalId (no lookup needed!)
  await ctx.db.replace(cachedSync.internalId, dto.data);
  await ctx.db.patch(cachedSync._id, { checksum: dto.checksum });
}
```

**Performance benefits:**

- **No unnecessary reads**: If checksum matches, we skip reading the full document
- **No unnecessary writes**: Unchanged records are skipped entirely
- **No lookup overhead**: Updates use cached `internalId` instead of querying by external ID

### 3. Schema Changes

Add a dedicated `syncCache` table to separate sync metadata from domain data:

```typescript
syncCache: defineTable({
  checksum: v.string(),
  table: v.string(),
  externalId: v.number(),
  internalId: v.union(v.id("cases"), v.id("votes"), v.id("voteProposals")),
}).index("by_table_and_external_id", ["table", "externalId"]);
```

**Key design decisions:**

- **Separation of concerns**: Sync metadata (checksums) is kept separate from business data (cases, votes, voteProposals)
- **Internal ID caching**: The `internalId` field stores the Convex document ID, eliminating the need for lookups during updates
- **Efficient queries**: The `by_table_and_external_id` index enables O(1) lookups to check if an entity has been synced
- **Clean domain model**: Business tables remain unchanged with no sync-specific fields polluting their schema

### 4. Workflow Changes

```typescript
// 1. Sync all cases from API - returns ALL case IDs from the API
const caseIds = await step.runAction(internal.sync.cases.syncCases, {});

// 2. Sync votes for ALL cases in parallel
const votePromises = caseIds.map((id) =>
  step.runAction(internal.sync.votes.syncVotesForCase, { caseId: id }),
);
const voteResults = await Promise.all(votePromises);

// 3. Flatten ALL vote IDs returned from vote sync operations
const allVoteIds = voteResults.flatMap((result) => result);

// 4. Sync vote proposals for ALL votes in parallel
const proposalPromises = allVoteIds.map((voteId) =>
  step.runAction(internal.sync.votesProposals.syncVoteProposalsForVote, {
    voteId,
  }),
);
await Promise.all(proposalPromises);
```

**Key implementation notes:**

- `syncCases` returns **all case IDs from the API** (not a database query), effectively achieving the goal of syncing all entities
- This approach is more correct: we sync based on what the API knows about, not what might be in our database
- All sync operations run in parallel using `Promise.all` for maximum throughput
- Each sync action internally uses checksum-based change detection to skip unchanged records

### 5. Batch Processing

To handle large volumes of data within Convex's execution limits, sync operations process records in batches:

```typescript
export async function batcher<T, R>(
  items: T[],
  callback: (batch: T[]) => Promise<R>,
  batchSize: number = 50,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const result = await callback(batch);
    results.push(result);
  }
  return results;
}
```

**Usage in sync operations:**

```typescript
// Process cases in batches of 50
await batcher(casesWithChecksums, async (batch) => {
  return await ctx.runMutation(internal.sync.cases.batchUpsertCases, {
    batch,
  });
});
```

**Rationale:**

- Convex mutations have time and size limits
- Processing thousands of records in a single mutation could exceed these limits
- Batching ensures reliable execution even with large datasets
- Batch size of 50 provides good balance between throughput and transaction safety

## Consequences

### Positive

1. **Idempotent Operations**: Running the sync multiple times converges to the same correct state. No side effects from repeated executions.

2. **Schema Evolution Friendly**: Can modify the workflow, add fields, or restructure tables, then simply re-run the sync to backfill data. No need to delete and start over.

3. **Automatic Data Recovery**: Missing data (from previous bugs or failed syncs) automatically fills in on the next successful sync.

4. **Efficient Updates**: Checksum comparison is O(1) string comparison vs O(n) deep object comparison. Skips unnecessary database writes.

5. **Separation of Concerns**: Sync metadata (checksums, external IDs) is completely separated from business data, keeping domain models clean and focused.

6. **Internal ID Caching**: The `internalId` field in `syncCache` eliminates lookup overhead during updates—we never need to query the business table to find which document to update.

7. **No Unnecessary Reads**: When checksums match, we skip reading the full document entirely, saving database I/O.

8. **Change Tracking**: Can detect when API data changes even if specific fields appear the same (useful for audit trails).

9. **No False Positives**: Stripping API metadata (response timestamp) ensures only actual data changes trigger updates.

10. **Type Safety Maintained**: Still validate and parse data with Zod schemas. Keep all existing indexes and queryability.

11. **Scalable Processing**: Batch processing ensures reliable execution even with large datasets, staying within Convex's execution limits.

### Negative

1. **More API Calls**: Every sync iteration calls the API for all cases, all votes, and all proposals. However:
   - This is mitigated by running sync only once daily
   - The API doesn't provide filtering anyway, so we'd get all data regardless
   - Checksum comparison prevents unnecessary database writes

2. **Storage Overhead**: Additional `syncCache` table with one entry per synced entity. Each entry contains:
   - Checksum (64 characters / 64 bytes)
   - Table name (~10-15 bytes)
   - External ID (8 bytes as number)
   - Internal ID (string reference, ~50 bytes)
   - System fields (\_id, \_creationTime)
   - Total: ~150-200 bytes per synced entity
   - Trade-off: Separated metadata is cleaner than inline fields and enables better performance

3. **Two-Write Pattern**: Creating or updating an entity requires writing to both the business table and `syncCache`, doubling write operations. However, this is offset by skipping unchanged records entirely.

4. **Computation Overhead**: Must compute checksums during sync. However, SHA-256 is fast and the cost is negligible compared to network I/O.

5. **Initial Migration**: Existing records need corresponding `syncCache` entries created, but this happens automatically on first sync after implementation.

## Options Considered

### Option 1: Current Incremental Approach (Status Quo)

**Description**: Only sync votes for new/updated cases.

**Rejected because**:

- Causes data loss when existing cases get new votes
- Cannot handle schema evolution without data deletion
- No way to backfill missing data

### Option 2: Full Sync Every Time (No Optimization)

**Description**: Sync everything and update all records every time.

**Rejected because**:

- Unnecessary database writes for unchanged data
- Higher load on Convex database
- Slower sync execution
- Wastes resources when data rarely changes

### Option 3: Time-Based Differential Sync

**Description**: Track last sync time, only sync entities modified since then.

**Rejected because**:

- Stortinget API doesn't support date filtering
- Would need to fetch all data anyway to determine what changed
- Adds complexity without actual benefit given API constraints

### Option 4: Store Raw JSON Blobs with Checksums

**Description**: Store only JSON strings and checksums, no structured data.

**Rejected because**:

- Loses queryability (can't use indexes)
- Must parse JSON on every read
- Loses type safety
- Can't leverage Convex's relational features
- Critical indexes like `by_case_id`, `by_vote_id` become impossible

### Option 5: Hybrid Approach - Structured Data + Checksums (CHOSEN)

**Description**: Store validated structured data with checksum field for change detection.

**Accepted because**:

- Best of both worlds: fast change detection + queryability
- Maintains type safety and validation
- Preserves all existing indexes
- Efficient updates via checksum comparison
- Future-proof and schema-evolution friendly

## Further Details

### Checksum Implementation

The checksum function must be deterministic to ensure the same data always produces the same hash:

```typescript
export async function computeChecksum(data: unknown): Promise<string> {
  // Deterministic JSON stringify with sorted keys
  const json = JSON.stringify(data, (key, value) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return Object.keys(value)
        .sort()
        .reduce(
          (sorted, key) => {
            sorted[key] = value[key];
            return sorted;
          },
          {} as Record<string, unknown>,
        );
    }
    return value;
  });

  // Use Web Crypto API (available in V8 isolates)
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(json);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hashHex;
}
```

### Checksum Computation Timing

Always compute checksums on **stripped data** (after removing API metadata):

```typescript
const stripped = stripStortingetDtoMetadata(apiData);
const checksum = await computeChecksum(stripped);
const record = { ...stripped, _checksum: checksum };
```

This prevents false positives from `respons_dato_tid` changing on every API call.

### Performance Characteristics

- **Checksum computation**: ~0.1ms per record (negligible)
- **Database lookups**: Indexed queries remain fast
- **Updates skipped**: ~95%+ of records unchanged on typical sync
- **Overall sync time**: Dominated by network I/O, not computation

### Future Enhancements

If sync becomes too expensive in the future:

1. **Add `fullSync` flag**: Run full sync weekly, incremental daily
2. **Batch API calls**: If API supports batch endpoints
3. **Parallel execution**: Already implemented with `Promise.all`
4. **Checksum index**: Query all checksums first, compare in-memory before fetching records

### Migration Path

Existing records in `cases`, `votes`, and `voteProposals` tables without corresponding `syncCache` entries will be treated as new during the first sync after implementation. The sync will:

1. Query `syncCache` for each entity (returns `null` for existing records)
2. Treat `null` result as a new entity
3. Create `syncCache` entry with checksum and internal ID
4. Replace the existing entity data (ensuring it's up-to-date with API)

This automatic migration happens seamlessly during the first post-implementation sync. No manual intervention or data deletion required.

## References

- Stortinget API documentation: https://data.stortinget.no
- Convex schema design: https://docs.convex.dev/database/schemas
- SHA-256 hashing: Web standard crypto API (V8 runtime)
- Workflow implementation: `convex/sync/workflow.ts`
