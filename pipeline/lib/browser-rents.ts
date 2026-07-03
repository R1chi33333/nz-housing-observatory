/**
 * Fetch the canonical rent CSV through a real Chrome, which passes
 * the Imperva bot challenge on tenancy.govt.nz that blocks plain
 * HTTP clients. Works wherever Chrome is installed (locally, and on
 * GitHub runners under xvfb); when the challenge still wins, run.ts
 * falls back to the committed series.
 */

import { chromium } from '@playwright/test';

const RENTS_PAGE =
  'https://www.tenancy.govt.nz/about-tenancy-services/data-and-statistics/rental-bond-data/';
const CSV_LINK_SELECTOR = 'a[href*="detailed-monthly-region"]';

export async function fetchRentsCsvViaBrowser(): Promise<string> {
  const browser = await chromium.launch({ headless: false, channel: 'chrome' });
  try {
    const page = await browser.newPage();
    await page.goto(RENTS_PAGE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    // Give the challenge script time to settle and set its cookies.
    await page.waitForSelector(CSV_LINK_SELECTOR, { timeout: 20000 });

    const href = await page.evaluate((selector) => {
      const anchor = document.querySelector<HTMLAnchorElement>(selector);
      return anchor ? anchor.href : null;
    }, CSV_LINK_SELECTOR);
    if (!href) {
      throw new Error('Rent CSV link not found on the rental bond data page');
    }

    const csv = await page.evaluate(async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`CSV request failed: ${String(response.status)}`);
      }
      return response.text();
    }, href);

    if (!csv.startsWith('"Time Frame"')) {
      throw new Error('Downloaded content does not look like the rent CSV');
    }
    return csv;
  } finally {
    await browser.close();
  }
}
