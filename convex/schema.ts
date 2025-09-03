import { defineSchema, defineTable } from 'convex/server';
import { hearingValidator, caseValidator } from './validators';

export default defineSchema({
  hearings: defineTable(hearingValidator).index('by_hearing_id', ['id']),
  cases: defineTable(caseValidator).index('by_case_id', ['id']),
});
