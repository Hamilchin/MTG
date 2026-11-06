import type { Deck } from "../src/lib/decks.ts";
import type { MagicSet } from "../src/lib/sets.ts";
import { dedupe, HOUR_MS, isFresh, readCache, writeCache } from "./cache.ts";
import { fetchJson, HttpError, Throttle } from "./http.ts";

// The same endpoints 17Lands' Card Data page uses (and limitedgrades.com reads server-side).
// Responses carry no CORS headers, which is why this runs in the local server, not the browser.
// SEVENTEEN_LANDS_GAP_MS slows requests down (the hosted build uses a longer gap).
const throttle = new Throttle(Number(process.env.SEVENTEEN_LANDS_GAP_MS) || 400);
const BASE = "https://www.17lands.com";

// Once 17Lands refuses (403/429), stop asking for a while instead of hammering it.
const BACKOFF_MS = 30 * 60 * 1000;
let refusedUntil = 0;
let refusedStatus = 0;

export const refusing = (): boolean => Date.now() < refusedUntil;

const guarded = async <T>(load: () => Promise<T>): Promise<T> => {
  if (refusing()) throw new HttpError(refusedStatus, `17Lands refused an earlier request (HTTP ${refusedStatus})`);
  try {
    return await load();
  } catch (error) {
    if (error instanceof HttpError && (error.status === 403 || error.status === 429)) {
      refusedUntil = Date.now() + BACKOFF_MS;
      refusedStatus = error.status;
      console.warn(`[api] 17Lands returned HTTP ${error.status}; not asking again for ${BACKOFF_MS / 60_000} minutes`);
    }
    throw error;
  }
};

export interface ApiCard {
  name: string;
  rarity: string;
  url: string;
  url_back: string;
  avg_seen: number | null;
  avg_pick: number | null;
  game_count: number;
  win_rate: number | null;
  opening_hand_win_rate: number | null;
  drawn_win_rate: number | null;
  ever_drawn_game_count: number;
  ever_drawn_win_rate: number | null;
  never_drawn_win_rate: number | null;
}

export interface Filters {
  startDates: Record<string, string>;
  formats: Record<string, string[]>;
}

export const fetchFilters = (): Promise<Filters> =>
  dedupe("17lands-filters", async () => {
    const cached = await readCache<Filters>("17lands-filters");
    if (cached && isFresh(cached, 12 * HOUR_MS)) return cached.value;
    try {
      const { body } = await guarded(() =>
        fetchJson<{
          start_dates: Record<string, string>;
          formats_by_expansion: Record<string, string[]>;
        }>(`${BASE}/data/filters`, throttle)
      );
      const filters = { startDates: body.start_dates ?? {}, formats: body.formats_by_expansion ?? {} };
      await writeCache("17lands-filters", filters);
      return filters;
    } catch (error) {
      if (cached) return cached.value;
      throw error;
    }
  });

/** Per-card stats over all decks (deck = null) or one color pair's decks. */
export const fetchCardData = async (set: MagicSet, deck: Deck | null): Promise<ApiCard[]> => {
  const query: Record<string, string> = {
    expansion: set.code17Lands,
    event_type: set.format,
    time_period: set.timePeriod,
  };
  if (deck) query.colors = deck.code.toUpperCase();
  const url = `${BASE}/api/card_data?${new URLSearchParams(query)}`;
  const { body } = await guarded(() => fetchJson<{ data: ApiCard[] } | ApiCard[]>(url, throttle));
  return Array.isArray(body) ? body : body.data ?? [];
};

/** The 17Lands Card Data page these numbers come from, for links in the UI. */
export const cardDataPage = (set: MagicSet): string =>
  `${BASE}/card_data?${new URLSearchParams({ expansion: set.code17Lands, format: set.format })}`;
