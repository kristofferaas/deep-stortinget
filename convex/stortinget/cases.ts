import { v } from "convex/values";
import { query } from "../_generated/server";
import { paginationOptsValidator } from "convex/server";
import { caseValidator, voteValidator } from "../sync/validators";

export const paginatedCases = query({
  args: {
    paginationOpts: paginationOptsValidator,
    types: v.optional(
      v.array(
        v.union(
          v.literal("budsjett"),
          v.literal("lovsak"),
          v.literal("alminneligsak"),
        ),
      ),
    ),
    statuses: v.optional(
      v.array(
        v.union(
          v.literal("varslet"),
          v.literal("mottatt"),
          v.literal("til_behandling"),
          v.literal("behandlet"),
          v.literal("trukket"),
          v.literal("bortfalt"),
        ),
      ),
    ),
  },
  returns: v.object({
    page: v.array(
      v.object({
        id: v.number(),
        type: v.string(),
        tittel: v.string(),
        korttittel: v.string(),
        status: v.string(),
        dokumentgruppe: v.string(),
        sist_oppdatert_dato: v.string(),
        sak_fremmet_id: v.number(),
        henvisning: v.optional(v.string()),
        votes: v.number(),
      }),
    ),
    isDone: v.boolean(),
    continueCursor: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    // Select the most efficient index based on which filters are applied
    // This avoids full table scans and uses compound indexes where possible
    const hasSingleType = args.types?.length === 1;
    const hasMultipleTypes = args.types && args.types.length > 1;
    const hasSingleStatus = args.statuses?.length === 1;
    const hasMultipleStatuses = args.statuses && args.statuses.length > 1;

    let query;

    // Case 1: Single type AND single status - use compound index
    if (hasSingleType && hasSingleStatus) {
      query = ctx.db
        .query("cases")
        .withIndex("by_type_and_status_and_last_updated_date", (q) =>
          q.eq("type", args.types![0]).eq("status", args.statuses![0]),
        )
        .order("desc");
    }
    // Case 2: Single type only - use type index
    else if (hasSingleType && !args.statuses) {
      query = ctx.db
        .query("cases")
        .withIndex("by_type_and_last_updated_date", (q) =>
          q.eq("type", args.types![0]),
        )
        .order("desc");
    }
    // Case 3: Single status only - use status index
    else if (hasSingleStatus && !args.types) {
      query = ctx.db
        .query("cases")
        .withIndex("by_status_and_last_updated_date", (q) =>
          q.eq("status", args.statuses![0]),
        )
        .order("desc");
    }
    // Case 4: Single type + multiple statuses - use type index, filter statuses
    else if (hasSingleType && hasMultipleStatuses) {
      query = ctx.db
        .query("cases")
        .withIndex("by_type_and_last_updated_date", (q) =>
          q.eq("type", args.types![0]),
        )
        .order("desc")
        .filter((q) => {
          const statusConditions = args.statuses!.map((status) =>
            q.eq(q.field("status"), status),
          );
          return statusConditions.reduce((acc, curr) => q.or(acc, curr));
        });
    }
    // Case 5: Multiple types + single status - use status index, filter types
    else if (hasMultipleTypes && hasSingleStatus) {
      query = ctx.db
        .query("cases")
        .withIndex("by_status_and_last_updated_date", (q) =>
          q.eq("status", args.statuses![0]),
        )
        .order("desc")
        .filter((q) => {
          const typeConditions = args.types!.map((type) =>
            q.eq(q.field("type"), type),
          );
          return typeConditions.reduce((acc, curr) => q.or(acc, curr));
        });
    }
    // Case 6: Multiple types + multiple statuses OR no filters
    // Use date index and filter both (less efficient but supports all combinations)
    else {
      query = ctx.db
        .query("cases")
        .withIndex("by_last_updated_date")
        .order("desc");

      if (args.types || args.statuses) {
        query = query.filter((q) => {
          let conditions = [];

          if (args.types && args.types.length > 0) {
            const typeConditions = args.types.map((type) =>
              q.eq(q.field("type"), type),
            );
            conditions.push(
              typeConditions.reduce((acc, curr) => q.or(acc, curr)),
            );
          }

          if (args.statuses && args.statuses.length > 0) {
            const statusConditions = args.statuses.map((status) =>
              q.eq(q.field("status"), status),
            );
            conditions.push(
              statusConditions.reduce((acc, curr) => q.or(acc, curr)),
            );
          }

          return conditions.length > 0
            ? conditions.reduce((acc, curr) => q.and(acc, curr))
            : q.eq(true, true);
        });
      }
    }

    const result = await query.paginate(args.paginationOpts);

    const votesForCases = await Promise.all(
      result.page.map((doc) =>
        ctx.db
          .query("votes")
          .withIndex("by_case_id", (q) => q.eq("sak_id", doc.id))
          .collect(),
      ),
    );

    const cases = result.page.map((doc, index) => ({
      id: doc.id,
      type: doc.type,
      tittel: doc.tittel,
      korttittel: doc.korttittel,
      status: doc.status,
      dokumentgruppe: doc.dokumentgruppe,
      sist_oppdatert_dato: doc.sist_oppdatert_dato,
      sak_fremmet_id: doc.sak_fremmet_id,
      henvisning: doc.henvisning,
      votes: votesForCases[index]?.length ?? 0,
    }));

    return {
      page: cases,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const getCaseById = query({
  args: { id: v.number() },
  returns: v.union(
    v.object({
      case: caseValidator,
      votes: v.array(voteValidator),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("cases")
      .withIndex("by_case_id", (q) => q.eq("id", args.id))
      .unique();

    if (!doc) return null;

    const votes = await ctx.db
      .query("votes")
      .withIndex("by_case_id", (q) => q.eq("sak_id", args.id))
      .collect();

    const serializedCase = {
      id: doc.id,
      type: doc.type,
      tittel: doc.tittel,
      korttittel: doc.korttittel,
      status: doc.status,
      dokumentgruppe: doc.dokumentgruppe,
      sist_oppdatert_dato: doc.sist_oppdatert_dato,
      sak_fremmet_id: doc.sak_fremmet_id,
      henvisning: doc.henvisning,
    };

    const serializedVotes = votes.map((v) => ({
      sak_id: v.sak_id,
      vedtatt: v.vedtatt,
      votering_id: v.votering_id,
      votering_resultat_type: v.votering_resultat_type,
      votering_resultat_type_tekst: v.votering_resultat_type_tekst,
      votering_tema: v.votering_tema,
      votering_tid: v.votering_tid,
    }));

    return {
      case: serializedCase,
      votes: serializedVotes,
    };
  },
});
