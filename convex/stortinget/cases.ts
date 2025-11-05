import { v } from "convex/values";
import { query } from "../_generated/server";
import { paginationOptsValidator } from "convex/server";
import { caseValidator, voteValidator } from "../sync/validators";

export const paginatedCases = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
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
    // When search is provided, use full-text search index
    // Trade-off: Search queries use offset-based pagination (limited to ~100 results)
    // while non-search queries use efficient cursor-based pagination (unlimited).
    // This is necessary because full-text search with in-memory filtering
    // requires loading all matching results to paginate correctly.
    if (args.search) {
      // Parse offset from cursor (for search pagination)
      const offset = args.paginationOpts.cursor
        ? parseInt(args.paginationOpts.cursor, 10)
        : 0;

      // Search using a single title search index to reduce storage overhead.
      // We search the main 'tittel' field via the index, then filter 'korttittel'
      // in memory. This avoids maintaining duplicate search indexes while still
      // supporting searches in both fields.
      const searchResults = await ctx.db
        .query("cases")
        .withSearchIndex("search_title", (q) => {
          let searchQuery = q.search("tittel", args.search!);

          // Apply single filter values using .eq() if only one selected
          if (args.types && args.types.length === 1) {
            searchQuery = searchQuery.eq("type", args.types[0]);
          }
          if (args.statuses && args.statuses.length === 1) {
            searchQuery = searchQuery.eq("status", args.statuses[0]);
          }

          return searchQuery;
        })
        .take(100);

      // Also check korttittel in memory for cases that might only match short title
      const searchLower = args.search.toLowerCase();
      let uniqueResults = searchResults.filter(
        (doc) =>
          doc.tittel.toLowerCase().includes(searchLower) ||
          doc.korttittel.toLowerCase().includes(searchLower),
      );

      // Apply multi-select type and status filters in memory if needed
      let filteredResults = uniqueResults;

      if (args.types && args.types.length > 1) {
        const validTypes = new Set(args.types);
        filteredResults = filteredResults.filter((doc) => {
          const docType = doc.type as
            | "budsjett"
            | "lovsak"
            | "alminneligsak";
          return validTypes.has(docType);
        });
      }

      if (args.statuses && args.statuses.length > 1) {
        const validStatuses = new Set(args.statuses);
        filteredResults = filteredResults.filter((doc) => {
          const docStatus = doc.status as
            | "varslet"
            | "mottatt"
            | "til_behandling"
            | "behandlet"
            | "trukket"
            | "bortfalt";
          return validStatuses.has(docStatus);
        });
      }

      // Sort by last updated date descending for consistent pagination
      filteredResults.sort((a, b) =>
        b.sist_oppdatert_dato.localeCompare(a.sist_oppdatert_dato),
      );

      // Implement offset-based pagination for search results
      const pageSize = args.paginationOpts.numItems;
      const startIndex = offset;
      const endIndex = startIndex + pageSize;
      const paginatedResults = filteredResults.slice(startIndex, endIndex);
      const isDone = endIndex >= filteredResults.length;
      const nextCursor = isDone ? null : endIndex.toString();

      const votesForCases = await Promise.all(
        paginatedResults.map((doc) =>
          ctx.db
            .query("votes")
            .withIndex("by_case_id", (q) => q.eq("sak_id", doc.id))
            .collect(),
        ),
      );

      const cases = paginatedResults.map((doc, index) => ({
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
        isDone,
        continueCursor: nextCursor,
      };
    }

    // When no search, use regular index-based pagination with filters
    let query = ctx.db
      .query("cases")
      .withIndex("by_last_updated_date")
      .order("desc");

    // Apply type and status filters using Convex filter
    if (args.types || args.statuses) {
      query = query.filter((q) => {
        let conditions = [];

        // Type filter
        if (args.types && args.types.length > 0) {
          const typeConditions = args.types.map((type) =>
            q.eq(q.field("type"), type),
          );
          conditions.push(
            typeConditions.reduce((acc, curr) => q.or(acc, curr)),
          );
        }

        // Status filter
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
