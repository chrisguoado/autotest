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
