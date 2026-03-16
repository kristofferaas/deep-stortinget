import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalAction, internalMutation, query } from "../_generated/server";

const STORTINGET_PERIODS_URL = "https://data.stortinget.no/eksport/stortingsperioder?format=json";

type StortingetPeriodResponse = {
  respons_dato_tid?: string;
  versjon?: string;
  innevaerende_stortingsperiode?: {
    id?: string;
  };
  stortingsperioder_liste?: Array<{
    fra?: string;
    id?: string;
    til?: string;
  }>;
};

type StorePeriodsSnapshotResult = {
  inserted: number;
  updated: number;
  deleted: number;
  total: number;
};

type SyncFromStortingetResult = StorePeriodsSnapshotResult & {
  fetchedAt: number;
  currentPeriodId?: string;
};

function parseStortingetDate(value: string, fieldName: string): number {
  const match = /^\/Date\((-?\d+)([+-]\d{4})?\)\/$/.exec(value);
  if (!match) {
    throw new Error(`Invalid Stortinget date in ${fieldName}: ${value}`);
  }

  return Number(match[1]);
}

function normalizePeriods(payload: StortingetPeriodResponse) {
  const currentPeriodId =
    typeof payload.innevaerende_stortingsperiode?.id === "string"
      ? payload.innevaerende_stortingsperiode.id
      : undefined;

  if (
    !Array.isArray(payload.stortingsperioder_liste) ||
    payload.stortingsperioder_liste.length === 0
  ) {
    throw new Error("Stortinget periods response did not contain any periods.");
  }

  const periods = payload.stortingsperioder_liste.map((period, index) => {
    if (typeof period.id !== "string" || period.id.length === 0) {
      throw new Error(`Missing period id at index ${index}.`);
    }

    if (typeof period.fra !== "string" || typeof period.til !== "string") {
      throw new Error(`Missing date fields for period ${period.id}.`);
    }

    return {
      periodId: period.id,
      startDate: parseStortingetDate(period.fra, `stortingsperioder_liste[${index}].fra`),
      endDate: parseStortingetDate(period.til, `stortingsperioder_liste[${index}].til`),
      isCurrent: period.id === currentPeriodId,
    };
  });

  const periodIds = new Set<string>();
  for (const period of periods) {
    if (periodIds.has(period.periodId)) {
      throw new Error(`Duplicate period id received from Stortinget: ${period.periodId}`);
    }
    periodIds.add(period.periodId);
  }

  return {
    currentPeriodId,
    periods,
    sourceResponseAt:
      typeof payload.respons_dato_tid === "string"
        ? parseStortingetDate(payload.respons_dato_tid, "respons_dato_tid")
        : undefined,
    sourceVersion: typeof payload.versjon === "string" ? payload.versjon : undefined,
  };
}

export const getPeriods = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.id("periods"),
      periodId: v.string(),
      startDate: v.number(),
      endDate: v.number(),
      isCurrent: v.boolean(),
      sourceResponseAt: v.optional(v.number()),
      sourceVersion: v.optional(v.string()),
      lastSyncedAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const periods = await ctx.db.query("periods").withIndex("by_startDate").order("desc").collect();

    return periods.map((period) => ({
      id: period._id,
      periodId: period.periodId,
      startDate: period.startDate,
      endDate: period.endDate,
      isCurrent: period.isCurrent,
      sourceResponseAt: period.sourceResponseAt,
      sourceVersion: period.sourceVersion,
      lastSyncedAt: period.lastSyncedAt,
    }));
  },
});

export const storePeriodsSnapshot = internalMutation({
  args: {
    periods: v.array(
      v.object({
        periodId: v.string(),
        startDate: v.number(),
        endDate: v.number(),
        isCurrent: v.boolean(),
      }),
    ),
    sourceResponseAt: v.optional(v.number()),
    sourceVersion: v.optional(v.string()),
    lastSyncedAt: v.number(),
  },
  returns: v.object({
    inserted: v.number(),
    updated: v.number(),
    deleted: v.number(),
    total: v.number(),
  }),
  handler: async (ctx, args) => {
    const existingPeriods = await ctx.db.query("periods").collect();
    const existingByPeriodId = new Map(existingPeriods.map((period) => [period.periodId, period]));
    const incomingIds = new Set(args.periods.map((period) => period.periodId));

    let inserted = 0;
    let updated = 0;
    let deleted = 0;

    for (const period of args.periods) {
      const periodDoc = {
        periodId: period.periodId,
        startDate: period.startDate,
        endDate: period.endDate,
        isCurrent: period.isCurrent,
        sourceResponseAt: args.sourceResponseAt,
        sourceVersion: args.sourceVersion,
        lastSyncedAt: args.lastSyncedAt,
      };

      const existingPeriod = existingByPeriodId.get(period.periodId);
      if (existingPeriod) {
        await ctx.db.patch(existingPeriod._id, periodDoc);
        updated += 1;
        continue;
      }

      await ctx.db.insert("periods", periodDoc);
      inserted += 1;
    }

    for (const existingPeriod of existingPeriods) {
      if (incomingIds.has(existingPeriod.periodId)) {
        continue;
      }

      await ctx.db.delete(existingPeriod._id);
      deleted += 1;
    }

    return {
      inserted,
      updated,
      deleted,
      total: args.periods.length,
    };
  },
});

export const syncFromStortinget = internalAction({
  args: {},
  returns: v.object({
    inserted: v.number(),
    updated: v.number(),
    deleted: v.number(),
    total: v.number(),
    fetchedAt: v.number(),
    currentPeriodId: v.optional(v.string()),
  }),
  handler: async (ctx): Promise<SyncFromStortingetResult> => {
    const response = await fetch(STORTINGET_PERIODS_URL, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch stortingsperioder: ${response.status} ${response.statusText}`,
      );
    }

    const payload = (await response.json()) as StortingetPeriodResponse;
    const normalized = normalizePeriods(payload);
    const fetchedAt = Date.now();

    const result: StorePeriodsSnapshotResult = await ctx.runMutation(
      internal.stortinget.periods.storePeriodsSnapshot,
      {
        periods: normalized.periods,
        sourceResponseAt: normalized.sourceResponseAt,
        sourceVersion: normalized.sourceVersion,
        lastSyncedAt: fetchedAt,
      },
    );

    return {
      ...result,
      fetchedAt,
      currentPeriodId: normalized.currentPeriodId,
    };
  },
});
