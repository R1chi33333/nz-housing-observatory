/**
 * Canonical region registry. Every source spells region names its own
 * way (MBIE: "Auckland Region", HUD: "Auckland", odd whitespace and
 * apostrophe variants exist), so all pipeline joins go through slugs.
 */

export interface Region {
  slug: string;
  name: string;
}

export const REGIONS: readonly Region[] = [
  { slug: 'northland', name: 'Northland' },
  { slug: 'auckland', name: 'Auckland' },
  { slug: 'waikato', name: 'Waikato' },
  { slug: 'bay-of-plenty', name: 'Bay of Plenty' },
  { slug: 'gisborne', name: 'Gisborne' },
  { slug: 'hawkes-bay', name: "Hawke's Bay" },
  { slug: 'taranaki', name: 'Taranaki' },
  { slug: 'manawatu-whanganui', name: 'Manawatu-Whanganui' },
  { slug: 'wellington', name: 'Wellington' },
  { slug: 'tasman', name: 'Tasman' },
  { slug: 'nelson', name: 'Nelson' },
  { slug: 'marlborough', name: 'Marlborough' },
  { slug: 'west-coast', name: 'West Coast' },
  { slug: 'canterbury', name: 'Canterbury' },
  { slug: 'otago', name: 'Otago' },
  { slug: 'southland', name: 'Southland' },
] as const;

export const NATIONAL_SLUG = 'new-zealand';

/**
 * Normalise a source's region label to a canonical slug, or undefined
 * for labels that are not regions (suppressed rows, "Area Outside
 * Region", territorial authorities and so on).
 */
export function normaliseRegionName(raw: string): string | undefined {
  const cleaned = raw
    .normalize('NFD')
    .replaceAll(/\p{M}/gu, '')
    .toLowerCase()
    .replaceAll(/[‘’']/g, '')
    .replaceAll(/\s+(region|district|city)$/g, '')
    .replaceAll(/[^a-z]+/g, '-')
    .replaceAll(/^-|-$/g, '');

  const alias: Record<string, string> = {
    'manawatu-wanganui': 'manawatu-whanganui',
    'hawke-s-bay': 'hawkes-bay',
  };
  const slug = alias[cleaned] ?? cleaned;

  return REGIONS.some((region) => region.slug === slug) ? slug : undefined;
}
