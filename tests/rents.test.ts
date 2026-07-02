import { describe, expect, it, vi } from 'vitest';
import { cleanRents, fetchRentRecords, type RawRentRecord } from '../pipeline/lib/rents.ts';

function record(overrides: Partial<RawRentRecord>): RawRentRecord {
  return {
    Location: 'Auckland Region',
    'Time Frame': '2026-05-01T00:00:00',
    'Median Rent': 650,
    'Lower Quartile Rent': 560,
    'Upper Quartile Rent': 750,
    'Lodged Bonds': 3200,
    ...overrides,
  };
}

describe('cleanRents', () => {
  it('groups records into sorted per-region series', () => {
    const cleaned = cleanRents([
      record({ 'Time Frame': '2026-05-01T00:00:00' }),
      record({ 'Time Frame': '2026-03-01T00:00:00', 'Median Rent': 640 }),
      record({ Location: 'Wellington Region', 'Median Rent': 600 }),
    ]);

    const auckland = cleaned.get('auckland');
    expect(auckland?.map((p) => p.month)).toEqual(['2026-03', '2026-05']);
    expect(auckland?.[0]?.medianRent).toBe(640);
    expect(cleaned.get('wellington')?.[0]?.medianRent).toBe(600);
  });

  it('maps ALL to the national series and drops NA and unknown locations', () => {
    const cleaned = cleanRents([
      record({ Location: 'ALL' }),
      record({ Location: 'NA' }),
      record({ Location: 'Far North District' }),
    ]);

    expect([...cleaned.keys()]).toEqual(['new-zealand']);
  });

  it('omits suppressed values instead of inventing them', () => {
    const cleaned = cleanRents([
      record({ 'Median Rent': null, 'Lower Quartile Rent': 0, 'Lodged Bonds': 12 }),
    ]);

    const point = cleaned.get('auckland')?.[0];
    expect(point?.medianRent).toBeUndefined();
    expect(point?.rentLowerQuartile).toBeUndefined();
    expect(point?.rentUpperQuartile).toBe(750);
    expect(point?.lodgedBonds).toBe(12);
  });

  it('keeps the latest record when a month appears twice', () => {
    const cleaned = cleanRents([record({ 'Median Rent': 600 }), record({ 'Median Rent': 660 })]);

    expect(cleaned.get('auckland')).toHaveLength(1);
    expect(cleaned.get('auckland')?.[0]?.medianRent).toBe(660);
  });

  it('drops malformed time frames', () => {
    const cleaned = cleanRents([record({ 'Time Frame': 'garbage' })]);
    expect(cleaned.size).toBe(0);
  });
});

describe('fetchRentRecords', () => {
  it('pages through the datastore until total is reached', async () => {
    const page = (offset: number, total: number) =>
      new Response(
        JSON.stringify({
          success: true,
          result: { records: [record({ 'Lodged Bonds': offset })], total },
        }),
      );
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(page(0, 2500))
      .mockResolvedValueOnce(page(1000, 2500))
      .mockResolvedValueOnce(page(2000, 2500));

    const records = await fetchRentRecords(fetchImpl);

    expect(records).toHaveLength(3);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    const secondUrl = fetchImpl.mock.calls[1]?.[0];
    expect(typeof secondUrl === 'string' ? secondUrl : '').toContain('offset=1000');
  });

  it('throws on http errors', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 503 }));
    await expect(fetchRentRecords(fetchImpl)).rejects.toThrow('503');
  });

  it('throws when the datastore reports failure', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ success: false })));
    await expect(fetchRentRecords(fetchImpl)).rejects.toThrow('reported failure');
  });
});
