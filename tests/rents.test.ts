import { describe, expect, it } from 'vitest';
import { cleanRents, parseRentsCsv, type RawRentRow } from '../pipeline/lib/rents.ts';

const HEADER =
  '"Time Frame","Location Id","Location","Lodged Bonds","Active Bonds","Closed Bonds","Median Rent","Geometric Mean Rent","Upper Quartile Rent","Lower Quartile Rent","Log Std Dev Weekly Rent"';

function csvLine(
  timeFrame: string,
  location: string,
  bonds: string,
  median: string,
  upper: string,
  lower: string,
): string {
  return `"${timeFrame}","2","${location}","${bonds}","28836","1,962","${median}","186","${upper}","${lower}","0.36"`;
}

describe('parseRentsCsv', () => {
  it('parses quoted fields with comma thousands separators', () => {
    const rows = parseRentsCsv(
      [HEADER, csvLine('2026-04-01', 'Auckland Region', '2,376', '680', '780', '580')].join('\n'),
    );
    expect(rows).toEqual([
      {
        location: 'Auckland Region',
        timeFrame: '2026-04-01',
        medianRent: 680,
        lowerQuartile: 580,
        upperQuartile: 780,
        lodgedBonds: 2376,
      },
    ]);
  });

  it('treats blanks, dashes and zeros as suppressed', () => {
    const rows = parseRentsCsv(
      [HEADER, csvLine('2026-04-01', 'Gisborne Region', '', '-', '0', '  ')].join('\r\n'),
    );
    expect(rows[0]).toMatchObject({
      lodgedBonds: undefined,
      medianRent: undefined,
      upperQuartile: undefined,
      lowerQuartile: undefined,
    });
  });

  it('throws on an empty file or a changed header', () => {
    expect(() => parseRentsCsv('')).toThrow('empty');
    expect(() => parseRentsCsv('"Totally","Different"\n"1","2"')).toThrow('header changed');
  });
});

function row(overrides: Partial<RawRentRow>): RawRentRow {
  return {
    location: 'Auckland Region',
    timeFrame: '2026-04-01',
    medianRent: 650,
    lowerQuartile: 560,
    upperQuartile: 750,
    lodgedBonds: 3200,
    ...overrides,
  };
}

describe('cleanRents', () => {
  it('groups rows into sorted per-region series', () => {
    const cleaned = cleanRents([
      row({ timeFrame: '2026-04-01' }),
      row({ timeFrame: '2026-02-01', medianRent: 640 }),
      row({ location: 'Wellington Region', medianRent: 600 }),
    ]);

    const auckland = cleaned.get('auckland');
    expect(auckland?.map((p) => p.month)).toEqual(['2026-02', '2026-04']);
    expect(auckland?.[0]?.medianRent).toBe(640);
    expect(cleaned.get('wellington')?.[0]?.medianRent).toBe(600);
  });

  it('maps ALL to the national series and drops NA and unknown locations', () => {
    const cleaned = cleanRents([
      row({ location: 'ALL' }),
      row({ location: 'NA' }),
      row({ location: 'Far North District' }),
    ]);

    expect([...cleaned.keys()]).toEqual(['new-zealand']);
  });

  it('omits suppressed values instead of inventing them', () => {
    const cleaned = cleanRents([row({ medianRent: undefined, lowerQuartile: undefined })]);

    const point = cleaned.get('auckland')?.[0];
    expect(point?.medianRent).toBeUndefined();
    expect(point?.rentLowerQuartile).toBeUndefined();
    expect(point?.rentUpperQuartile).toBe(750);
    expect(point?.lodgedBonds).toBe(3200);
  });

  it('keeps the latest row when a month appears twice', () => {
    const cleaned = cleanRents([row({ medianRent: 600 }), row({ medianRent: 660 })]);

    expect(cleaned.get('auckland')).toHaveLength(1);
    expect(cleaned.get('auckland')?.[0]?.medianRent).toBe(660);
  });

  it('drops malformed time frames', () => {
    const cleaned = cleanRents([row({ timeFrame: 'garbage' })]);
    expect(cleaned.size).toBe(0);
  });
});

describe('parseRentsCsv end to end with cleanRents', () => {
  it('round-trips a realistic snippet', () => {
    const csv = [
      HEADER,
      csvLine('2026-03-01', 'ALL', '9,147', '620', '750', '500'),
      csvLine('2026-03-01', 'NA', '417', '560', '640', '470'),
      csvLine('2026-03-01', 'Auckland Region', '2,376', '680', '780', '580'),
      csvLine('2026-04-01', 'Auckland Region', '2,410', '685', '790', '585'),
    ].join('\r\n');

    const cleaned = cleanRents(parseRentsCsv(csv));

    expect([...cleaned.keys()].sort()).toEqual(['auckland', 'new-zealand']);
    expect(cleaned.get('auckland')?.map((p) => p.medianRent)).toEqual([680, 685]);
  });
});
