/* eslint-disable no-await-in-loop */
import { click, input, query } from '../../../common/util.js';

export const config = {
  project: 'my_test_project',
  name: 'DeviceTypeManagement',
  description: 'CRUD of devie type',

  deviceType: 'autotest-CleanRobot',

  entries: [    
    {
      url: 'https://your-server/your-url',
      auth: {
        username: 'your-user',
        password: 'your-password',
        captcha: 'fixd',
      },
    },        
  ],
};

export async function run(page, crawl, option) {
  const result = {
    case: {
      project: config.project,
      name: config.name,
      description: config.description,
      status: 'FAIL',
    },
  };

  try {
    // You can access the page object before requests
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      // console.log(request.url());

      const requestUrl = request.url();

      request.continue();
    });

    // The result contains options, links, cookies and etc.
    Object.assign(
      result,
      await crawl().catch((e) => {
        throw new Error(`failed to crawl page ${option.url}`);
      })
    );

    const cur = page.url();

    if (cur.startsWith('https://portal-newdev.center.org.cn/wsadmin/login')) {
      // login in first
      await input(
        page,
        'input[placeholder="请输入账号"]',
        config.entries[0].auth.username
      ).catch((e) => {
        throw new Error(
          `failed to type into element 'input[placeholder="请输入账号"]'`
        );
      });

      await input(
        page,
        'input[placeholder="请输入密码"]',
        config.entries[0].auth.password
      ).catch((e) => {
        throw new Error(
          `failed to type into element 'input[placeholder="请输入密码"]'`
        );
      });

      await input(
        page,
        'input[placeholder="请输入验证码"]',
        config.entries[0].auth.captcha
      ).catch((e) => {
        throw new Error(
          `failed to type into element 'input[placeholder="请输入验证码"]'`
        );
      });

      await click(
        page,
        `xpath/.//button[@type='button']/span/span[text()='登 录']`,
        true
      ).catch((e) => {
        throw new Error(`failed to click on button '登 录'`);
      });

      this.logger.debug(`case ${config.name}: login successfully`);
    }

    if (cur.startsWith('https://portal-newdev.center.org.cn')) {
      // handle the test logic
      this.logger.debug(`case ${config.name}: test logic starts`);

      await click(
        page,
        `xpath/.//div[@class="tag" and contains(., '运营管理平台')]`
      ).catch((e) => {
        throw new Error(`failed to navigate to app '运营管理平台'`);
      });
      this.logger.debug(
        `case ${config.name}: navigate to menu 运营管理平台 successfully`
      );

      await click(page, `xpath/.//span[text()='系统设置']`).catch((e) => {
        throw new Error(`failed to navigate to menu '系统设置'`);
      });
      this.logger.debug(
        `case ${config.name}: navigate to menu 系统设置 successfully`
      );

      await click(page, `xpath/.//span[text()='配置管理']`).catch((e) => {
        throw new Error(`failed to navigate to menu '配置管理'`);
      });
      this.logger.debug(
        `case ${config.name}: navigate to menu 配置管理 successfully`
      );

      await click(page, `xpath/.//span[text()='设备类型管理']`).catch((e) => {
        throw new Error(`failed to navigate to menu '设备类型管理'`);
      });
      this.logger.debug(
        `case ${config.name}: navigate to menu 设备类型管理 successfully`
      );

      await click(page, `xpath/.//span[text()='新增']`).catch((e) => {
        throw new Error(`failed to click on button '新增'`);
      });
      this.logger.debug(
        `case ${config.name}: navigate and click on button 新增 successfully`
      );

      // create device type
      // await page.focus('input[type="text"]');
      await input(page, 'input[placeholder=""]', config.deviceType).catch(
        (e) => {
          throw new Error(
            `failed to type into element 'input[placeholder=""]'`
          );
        }
      );
      this.logger.debug(`case ${config.name}: input content successfully`);

      // save
      await click(page, `xpath/.//span[text()='保存']`).catch((e) => {
        throw new Error(`failed to click on button '保存'`);
      });
      this.logger.debug(
        `case ${config.name}: save the added device type successfully`
      );

      // query
      await query(page, `xpath/.//span[text()='${config.deviceType}']`).catch(
        (e) => {
          throw new Error(`fail to verify the added device type`);
        }
      );
      this.logger.debug(
        `case ${config.name}: the newly added device type has been validated successfully`
      );
      result.case.status = 'PASS';

      // case passed
    }
  } catch (e) {
    result.case.message = e.message || e.stack;
    this.logger.error(`case ${config.name} failed: ${result.case.message}`);
    // case failed
  }

  return result;
}
