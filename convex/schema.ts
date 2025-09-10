import { defineSchema, defineTable } from 'convex/server';
import { hearingValidator, caseValidator } from './validators';
import { voteValidator } from './sync/validators';
import { v } from 'convex/values';

export default defineSchema({
  hearings: defineTable(hearingValidator).index('by_hearing_id', ['id']),
  cases: defineTable(caseValidator)
    .index('by_case_id', ['id'])
    .index('by_last_updated_date', ['sist_oppdatert_dato']),
  votes: defineTable(voteValidator)
    .index('by_vote_id', ['votering_id'])
    .index('by_case_id', ['sak_id']),
  sync: defineTable(
    v.object({
      key: v.string(),
      status: v.union(
        v.literal('idle'),
        v.literal('in_progress'),
        v.literal('success'),
        v.literal('error')
      ),
      message: v.optional(v.string()),
      lastFinishedAt: v.number(),
    })
  ).index('by_key', ['key']),
});
