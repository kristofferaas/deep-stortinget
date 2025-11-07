import { v } from "convex/values";
import { query } from "../_generated/server";
import { paginationOptsValidator } from "convex/server";
import { hearingValidator } from "../sync/validators";

export const paginatedHearings = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(v.number()),
    type: v.optional(v.number()),
    fromDate: v.optional(v.string()),
    toDate: v.optional(v.string()),
  },
  returns: v.object({
    page: v.array(
      v.object({
        id: v.number(),
        status: v.number(),
        status_info_tekst: v.string(),
        type: v.number(),
        start_dato: v.string(),
        soknadfrist_dato: v.string(),
        innspillsfrist: v.string(),
        skriftlig: v.boolean(),
        anmodningsfrist_dato_tid: v.string(),
        sesjon_id: v.optional(v.string()),
        horing_status: v.string(),
      }),
    ),
    isDone: v.boolean(),
    continueCursor: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    // Get all hearings first
    const allHearings = await ctx.db.query("hearings").collect();

    // Apply filters
    let filteredHearings = allHearings;

    if (args.status !== undefined) {
      filteredHearings = filteredHearings.filter(
        (h) => h.status === args.status,
      );
    }

    if (args.type !== undefined) {
      filteredHearings = filteredHearings.filter((h) => h.type === args.type);
    }

    if (args.fromDate) {
      filteredHearings = filteredHearings.filter(
        (h) => h.start_dato >= args.fromDate!,
      );
    }

    if (args.toDate) {
      filteredHearings = filteredHearings.filter(
        (h) => h.start_dato <= args.toDate!,
      );
    }

    // Sort by start_dato descending
    filteredHearings.sort((a, b) => b.start_dato.localeCompare(a.start_dato));

    // Manual pagination
    const numItems = args.paginationOpts.numItems;
    const cursor = args.paginationOpts.cursor;

    let startIndex = 0;
    if (cursor) {
      // Parse cursor to get the index
      startIndex = parseInt(cursor, 10);
    }

    const endIndex = startIndex + numItems;
    const page = filteredHearings.slice(startIndex, endIndex);
    const isDone = endIndex >= filteredHearings.length;
    const continueCursor = isDone ? null : endIndex.toString();

    const hearings = page.map((doc) => ({
      id: doc.id,
      status: doc.status,
      status_info_tekst: doc.status_info_tekst,
      type: doc.type,
      start_dato: doc.start_dato,
      soknadfrist_dato: doc.soknadfrist_dato,
      innspillsfrist: doc.innspillsfrist,
      skriftlig: doc.skriftlig,
      anmodningsfrist_dato_tid: doc.anmodningsfrist_dato_tid,
      sesjon_id: doc.sesjon_id,
      horing_status: doc.horing_status,
    }));

    return {
      page: hearings,
      isDone,
      continueCursor,
    };
  },
});

export const getHearingById = query({
  args: { id: v.number() },
  returns: v.union(hearingValidator, v.null()),
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("hearings")
      .withIndex("by_hearing_id", (q) => q.eq("id", args.id))
      .unique();

    if (!doc) return null;

    return {
      id: doc.id,
      status: doc.status,
      status_info_tekst: doc.status_info_tekst,
      type: doc.type,
      start_dato: doc.start_dato,
      soknadfrist_dato: doc.soknadfrist_dato,
      innspillsfrist: doc.innspillsfrist,
      skriftlig: doc.skriftlig,
      anmodningsfrist_dato_tid: doc.anmodningsfrist_dato_tid,
      sesjon_id: doc.sesjon_id,
      horing_status: doc.horing_status,
    };
  },
});
