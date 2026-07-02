/** One month of observations for a region. Month is "YYYY-MM". */
export interface MonthPoint {
  month: string;
  /** Median weekly rent in NZD. Absent when the source suppressed it. */
  medianRent?: number;
  rentLowerQuartile?: number;
  rentUpperQuartile?: number;
  /** Bonds lodged in the month, a proxy for rental market volume. */
  lodgedBonds?: number;
  /** Median sale price in NZD over a 3-month rolling window. */
  medianSalePrice?: number;
  salesLowerQuartile?: number;
  salesUpperQuartile?: number;
  /** Residential sales in the rolling window. */
  residentialSales?: number;
}

export interface RegionSeries {
  slug: string;
  name: string;
  points: MonthPoint[];
}

export interface HousingData {
  national: RegionSeries;
  regions: RegionSeries[];
  meta: {
    generatedAt: string;
    sources: {
      name: string;
      url: string;
      licence: string;
      measures: string;
    }[];
  };
}
