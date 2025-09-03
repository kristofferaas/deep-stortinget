import { defineSchema, defineTable } from 'convex/server';
import { hearingValidator } from './validators';

export default defineSchema({
  hearings: defineTable(hearingValidator).index('by_hearing_id', ['id']),
});
