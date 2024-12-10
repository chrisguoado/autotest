import http from 'http';
import https from 'https';
import fs from 'fs';

export function download(url, filename) {
  const client = url.toString().indexOf('https') === 0 ? https : http;

  return new Promise((resolve, reject) => {
    client.get(url, (res) => {
      res
        .pipe(fs.createWriteStream(filename))
        .on('error', reject)
        .once('close', () => resolve(filename));
    });
  });
}

export async function query(page, selector) {
  // wait for the element being ready
  await page.waitForSelector(`${selector}`);

  const els = await page.$$(`${selector}`);
  return els;
}

export async function click(page, selector, waitForNavigation) {
  // wait for the element being ready
  await page.waitForSelector(`${selector}`);

  const [el] = await page.$$(`${selector}`);

  if (!el)
    throw new Error(
      `The element corresponding to the selector ${selector} does not exist`
    );

  if (!waitForNavigation) {
    await el.evaluate((item) => item.click());
  } else {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      el.evaluate((item) => item.click()),
    ]);
  }

  // handling a bug in old puppeteer, page.waitFor does not work well in old version
  // await page.waitFor(1000);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return el;
}

export async function input(page, selector, content) {
  await page.focus(selector);
  await page.keyboard.type(content);
}
