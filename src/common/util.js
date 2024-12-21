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
  let el;
  if (typeof selector === 'string' || selector instanceof String) {
    // wait for the element being ready
    await page.waitForSelector(`${selector}`);

    [el] = await page.$$(`${selector}`);
  } else {
    el = page;
    selector = waitForNavigation;
  }

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

export async function login({
  page,
  username,
  password,
  captcha,
  selUser = 'input[placeholder="请输入账号"]',
  selPass = 'input[placeholder="请输入密码"]',
  selCapt = 'input[placeholder="请输入验证码"]',
  selLogin = `xpath/.//button[@type='button']/span/span[text()='登 录']`,
} = {}) {
  // login in first
  await input(page, selUser, username).catch((e) => {
    throw new Error(`failed to type into element '${selUser}'`);
  });

  await input(page, selPass, password).catch((e) => {
    throw new Error(`failed to type into element '${selPass}'`);
  });

  await input(page, selCapt, captcha).catch((e) => {
    throw new Error(`failed to type into element '${selCapt}'`);
  });

  await click(page, selLogin, true).catch((e) => {
    throw new Error(`failed to click on button '${selLogin}'`);
  });
}

export async function topmost(page, selector) {
  const els = await query(page, selector);
  const zindexes = await Promise.all(
    els.map(async (el) => {
      // getProperty sees an error:
      //   !Protocol error (DOM.describeNode): Object id doesn't reference a Node
      // let style = await el.getProperty('style');
      // style = await style.jsonValue();

      // element.style only returns the attribute name, not good enough
      // const style = await el.evaluate((element) => element.style);
      const style = await el.evaluate((element) =>
        element.getAttribute('style')
      );

      const attrs = style.split(';').map((attr) => {
        let [key, value] = attr.split(':');
        key = key?.trim();
        value = value?.trim();
        return { key, value };
      });

      let zindex = attrs.findLast((attr) => attr.key === 'z-index')?.value;
      if (zindex !== undefined) zindex = parseInt(zindex);
      return { el, zindex };
    })
  );

  const top = zindexes
    .filter(({ zindex }) => zindex !== undefined)
    .reduce((p, v) => (p.zindex > v.zindex ? p : v));
  return top.el;
}

export default {
  page: {
    click,
    input,
    query,
    login,
  },
};
