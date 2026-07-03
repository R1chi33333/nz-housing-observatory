import { describe, expect, it } from 'vitest';
import { normaliseRegionName, REGIONS } from '../pipeline/lib/regions.ts';

describe('normaliseRegionName', () => {
  it('maps MBIE style names with the Region suffix', () => {
    expect(normaliseRegionName('Auckland Region')).toBe('auckland');
    expect(normaliseRegionName("Hawke's Bay Region")).toBe('hawkes-bay');
    expect(normaliseRegionName('Manawatu-Wanganui Region')).toBe('manawatu-whanganui');
  });

  it('maps HUD style bare names', () => {
    expect(normaliseRegionName('Auckland')).toBe('auckland');
    expect(normaliseRegionName('Bay of Plenty')).toBe('bay-of-plenty');
    expect(normaliseRegionName('West Coast')).toBe('west-coast');
  });

  it('handles apostrophe variants and macrons', () => {
    expect(normaliseRegionName('Hawke’s Bay')).toBe('hawkes-bay');
    expect(normaliseRegionName('Manawatū-Whanganui')).toBe('manawatu-whanganui');
  });

  it('maps Natural Earth style names with District and City suffixes', () => {
    expect(normaliseRegionName('Gisborne District')).toBe('gisborne');
    expect(normaliseRegionName('Marlborough District')).toBe('marlborough');
    expect(normaliseRegionName('Nelson City')).toBe('nelson');
    expect(normaliseRegionName('Tasman District')).toBe('tasman');
  });

  it('does not match outlying island units', () => {
    expect(normaliseRegionName('Auckland Islands')).toBeUndefined();
    expect(normaliseRegionName('Chatham Islands Territory')).toBeUndefined();
    expect(normaliseRegionName('Tokelau')).toBeUndefined();
  });

  it('returns undefined for non-region labels', () => {
    expect(normaliseRegionName('NA')).toBeUndefined();
    expect(normaliseRegionName('Area Outside Region')).toBeUndefined();
    expect(normaliseRegionName('Far North District')).toBeUndefined();
    expect(normaliseRegionName('')).toBeUndefined();
  });

  it('round-trips every canonical region name', () => {
    for (const region of REGIONS) {
      expect(normaliseRegionName(region.name)).toBe(region.slug);
      expect(normaliseRegionName(`${region.name} Region`)).toBe(region.slug);
    }
  });
});
