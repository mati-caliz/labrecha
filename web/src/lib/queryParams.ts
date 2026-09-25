import { CHAMBER_DEPUTIES } from "@/lib/chambers";

export const HERO_CODE = "cpi_monthly";
export const HERO_SOURCE = "argentinadatos";
export const HERO_POINTS = 24;
export const TILE_CODES = ["dollar_official", "country_risk", "international_reserves", "unemployment"];
export const TEASER_CODES = ["international_reserves", "cpi_monthly", "dollar_official"];

export const HOME_POSTS_PARAMS = { limit: 4 } as const;
export const RELATED_POSTS_PARAMS = { limit: 6 } as const;

export const NEWS_LIMIT = 40;
export const SCRAPE_RUNS_PARAMS = { limit: 200 } as const;

// El hemiciclo es el de Diputados, así que su acta de referencia no puede ser la del
// Senado aunque el Senado haya votado más tarde.
export const LATEST_VOTE_PARAMS = { limit: 1, chamber: CHAMBER_DEPUTIES } as const;
export const RECENT_VOTES_PARAMS = { limit: 8 } as const;
export const RECENT_LAWS_PARAMS = { limit: 8 } as const;
