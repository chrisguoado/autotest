import http from 'http';
import https from 'https';
import fs from 'fs';

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

export async function query(page, selector, hint = undefined, waitFor = true) {
  let el = page;

  if (hint) [el] = await query(page, hint, undefined, waitFor);

  // wait for the element being ready
  if (waitFor) await el.waitForSelector(`${selector}`);

  const els = await el.$$(`${selector}`);
  return els;
}

// parameter hint could be either a indicator for route
// change, or a selector hint string, just like input()
export async function click(page, selector, hint) {
  let el;
  let waitForNavigation = false;

  if (typeof hint === 'string' || hint instanceof String) {
    [el] = await query(page, hint);
    [el] = await query(el, selector);
  } else {
    waitForNavigation = hint;

    if (typeof selector === 'string' || selector instanceof String)
      [el] = await query(page, selector);
    else el = page;
  }

  if (!el) {
    // should not go here, undefined el will cause a timeout error before
    // going here
    throw new Error(
      `The element corresponding to the selector ${selector} does not exist`
    );
  }

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

export async function input(page, selector, content, hint) {
  let el = page;
  if (hint) [el] = await query(page, hint);

  // wait for the element being ready
  await el.waitForSelector(`${selector}`);

  // delay 50, types slower, like a user
  if (el.keyboard) {
    // in this case, el is page
    await el.focus(selector);
    await el.keyboard.type(content, { delay: 50 });
  } else {
    // in this case, el is an ElementHandle, ElementHandle.focus()
    // does not take any parameters
    [el] = await query(el, selector);
    await el.focus();
    await el.type(content, { delay: 100 });
  }
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
    throw new Error(`fail to type into element '${selUser}'`);
  });

  await input(page, selPass, password).catch((e) => {
    throw new Error(`fail to type into element '${selPass}'`);
  });

  await input(page, selCapt, captcha).catch((e) => {
    throw new Error(`fail to type into element '${selCapt}'`);
  });

  await click(page, selLogin, true).catch((e) => {
    throw new Error(`fail to click on button '${selLogin}'`);
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

// page: current page, the top level container
// el: is the container, e.g. a dialog, it could be any ElementHandle
// name: is the name of this dropdown element, just for logging purpose
// select: is the selector used to find out the select element
// hint: is the hint selector to help find out the select element, could be undefined
// popup: is the selector to locate the popup dropdown which has a z-index style
// item: is the selector indicating the item in the dropdown list
export async function dropdown({
  page,
  el,
  name,
  select,
  hint,
  popup,
  item,
} = {}) {
  if (!el) el = page;

  await click(
    el,
    select, // `xpath/.//span[contains(., '请选择')]`,
    hint // `xpath/.//label[contains(., '关联故障码')]/following-sibling::div`
  ).catch((e) => {
    throw new Error(`fail to navigate and click on select ${name}`);
  });

  // use page to find out topmost popup, instead of el container
  const top = await topmost(
    page,
    popup // `xpath/.//div[contains(@class, 'el-select-dropdown')]/parent::div`
  ).catch((e) => {
    throw new Error(`fail to find topmost dropdown ${name}`);
  });

  await click(
    top,
    // `xpath/.//ul/li[1]`
    // `xpath/.//ul/li/span[contains(., '${config.faultCode}')]`
    item
  ).catch((e) => {
    throw new Error(
      `failed to navigate and click on the specified item in dropdown ${name}`
    );
  });
}

export default {
  page: {
    sleep,
    click,
    input,
    query,
    login,
    topmost,
    dropdown,
  },
};
