import { describe, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';
import {
  cleanSales,
  excelSerialToMonth,
  extractWorkbookUrl,
  fetchSalesWorkbook,
  parseSalesSheet,
  type RawSalesRow,
} from '../pipeline/lib/prices.ts';

const MAY_2026 = 46143; // Excel serial for 2026-05-01

function row(overrides: Partial<RawSalesRow>): RawSalesRow {
  return {
    stat_type: '3-Month rolling',
    area_type: 'Region',
    area: 'Auckland',
    period: MAY_2026,
    residential_sales: 2100,
    lower_quartile_sale_price: 720000,
    median_sale_price: 1010000,
    upper_quartile_sale_price: 1400000,
    ...overrides,
  };
}

describe('extractWorkbookUrl', () => {
  it('finds the dated workbook link in page html', () => {
    const html =
      '<a href="/assets/Uploads/Documents/Property-and-Sales-data-download-June-2026.xlsx?m=abc123">Download</a>';
    expect(extractWorkbookUrl(html)).toBe(
      'https://www.hud.govt.nz/assets/Uploads/Documents/Property-and-Sales-data-download-June-2026.xlsx?m=abc123',
    );
  });

  it('throws when no link is present', () => {
    expect(() => extractWorkbookUrl('<html></html>')).toThrow('workbook link');
  });
});

describe('fetchSalesWorkbook', () => {
  it('follows the discovered link and returns the workbook bytes', async () => {
    const bytes = new Uint8Array([1, 2, 3]).buffer;
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response('<a href="/assets/Property-and-Sales-data-download-X.xlsx?m=1">x</a>'),
      )
      .mockResolvedValueOnce(new Response(bytes));

    const result = await fetchSalesWorkbook(fetchImpl);

    expect(new Uint8Array(result)).toEqual(new Uint8Array([1, 2, 3]));
    const workbookUrl = fetchImpl.mock.calls[1]?.[0];
    expect(typeof workbookUrl === 'string' ? workbookUrl : '').toContain(
      'Property-and-Sales-data-download-X.xlsx',
    );
  });

  it('throws on page and download failures', async () => {
    const failPage = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 500 }));
    await expect(fetchSalesWorkbook(failPage)).rejects.toThrow('500');

    const failDownload = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response('<a href="/assets/Property-and-Sales-data-download-X.xlsx">x</a>'),
      )
      .mockResolvedValueOnce(new Response('', { status: 404 }));
    await expect(fetchSalesWorkbook(failDownload)).rejects.toThrow('404');
  });
});

describe('excelSerialToMonth', () => {
  it('converts serial dates to months', () => {
    expect(excelSerialToMonth(MAY_2026)).toBe('2026-05');
    expect(excelSerialToMonth(29221)).toBe('1980-01');
  });

  it('rejects nonsense serials', () => {
    expect(excelSerialToMonth(0)).toBeUndefined();
    expect(excelSerialToMonth(-5)).toBeUndefined();
    expect(excelSerialToMonth(Number.NaN)).toBeUndefined();
    expect(excelSerialToMonth(99999999)).toBeUndefined();
  });
});

describe('parseSalesSheet', () => {
  it('reads the Sales sheet from a workbook buffer', () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([row({})]), 'Sales');
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;

    const rows = parseSalesSheet(buffer);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.area).toBe('Auckland');
  });

  it('throws when the Sales sheet is missing', () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ a: 1 }]), 'Other');
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;

    expect(() => parseSalesSheet(buffer)).toThrow('Sales sheet missing');
  });
});

describe('cleanSales', () => {
  it('keeps only 3-month rolling region and national rows', () => {
    const cleaned = cleanSales([
      row({}),
      row({ stat_type: 'Monthly', median_sale_price: 1 }),
      row({ stat_type: '12-Month rolling' }),
      row({ area_type: 'Territorial Authority', area: 'Far North District' }),
      row({ area_type: 'National', area: 'New Zealand', median_sale_price: 850000 }),
      row({ area_type: 'Region', area: 'Area Outside Region' }),
    ]);

    expect([...cleaned.keys()].sort()).toEqual(['auckland', 'new-zealand']);
    expect(cleaned.get('auckland')?.[0]?.medianSalePrice).toBe(1010000);
    expect(cleaned.get('new-zealand')?.[0]?.medianSalePrice).toBe(850000);
  });

  it('sorts months and omits suppressed values', () => {
    const cleaned = cleanSales([
      row({ period: MAY_2026, median_sale_price: null, residential_sales: 0 }),
      row({ period: MAY_2026 - 31, median_sale_price: 990000 }),
    ]);

    const auckland = cleaned.get('auckland');
    expect(auckland?.map((p) => p.month)).toEqual(['2026-03', '2026-05']);
    expect(auckland?.[1]?.medianSalePrice).toBeUndefined();
    expect(auckland?.[1]?.residentialSales).toBeUndefined();
    expect(auckland?.[1]?.salesUpperQuartile).toBe(1400000);
  });
});
