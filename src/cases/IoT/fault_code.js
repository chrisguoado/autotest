/* eslint-disable no-await-in-loop */
import entries from '../../common/entries.js';

export const config = {
  // mandatory properties
  project: 'IoT',
  name: 'fault_code_editable',
  description: `Create a fault code, edit the fault code, associate the fault code with an alarm rule, and then edit the fault code again. At this point, reselecting the model for the fault code is not allowed.`,

  // entries change frequently, so it's better to define them in common
  entries: [{ ...entries.IoT }],

  // properties related with test logic (optional)
  faultCode: 'Eb-03_q',
  faultName: '油量过低',
  faultDesc: '油量过低，有停机风险',
  deviceModel: '电动尘推车',
  ruleName: '油量过低',
  ruleProp: '油量',
  ruleOp: '<',
};

export async function run(page, crawl, option) {
  const { sleep, click, query, input, login, topmost, dropdown } =
    this.utils.page;

  const result = {
    case: {
      project: config.project,
      name: config.name,
      description: config.description,
      status: 'FAIL',
    },
  };

  try {
    // The result contains options, links, cookies and etc.
    Object.assign(
      result,
      await crawl().catch((e) => {
        throw new Error(`failed to crawl page ${option.url}`);
      })
    );

    const cur = page.url();
    const [entry] = config.entries;

    if (cur.startsWith(entry.login)) {
      await login({
        page,
        username: entry.auth.username,
        password: entry.auth.password,
        captcha: entry.auth.captcha,
        selUser: 'input[placeholder="请输入登录账号"]',
        selPass: 'input[placeholder="请输入登录密码"]',
        selCapt: 'input[placeholder="验证码"]',
        selLogin: `xpath/.//div[text()=' 登录 ']`,
      });

      this.logger.debug(`case ${config.name}: login`);
    }

    if (cur.startsWith(entry.url)) {
      // handle the test logic
      this.logger.debug(`case ${config.name}: test logic starts`);

      await click(page, `xpath/.//span[text()='我的应用']`).catch((e) => {
        throw new Error(`fail to navigate to menu 我的应用`);
      });
      this.logger.debug(`case ${config.name}: navigate to menu 我的应用`);

      await click(page, `xpath/.//div[text()='IOT']`, true).catch((e) => {
        throw new Error(`fail to navigate to app IoT`);
      });
      this.logger.debug(`case ${config.name}: navigate to app IoT`);

      await click(page, `xpath/.//span[text()='故障码管理']`).catch((e) => {
        throw new Error(`fail to navigate to menu 故障码管理`);
      });
      this.logger.debug(`case ${config.name}: navigate to menu 故障码管理`);

      await click(page, `xpath/.//span[text()='新增']`).catch((e) => {
        throw new Error(`fail to navigate and click on button 新增`);
      });
      this.logger.debug(
        `case ${config.name}: navigate and click on button 新增`
      );

      let [dialog] = await query(
        page,
        `xpath/.//header/span[contains(., '新增故障码')]/parent::header/parent::div`
      ).catch((e) => {
        throw new Error(`fail to find dialog 新增故障码`);
      });
      this.logger.debug(`case ${config.name}: find dialog 新增故障码`);

      await dropdown({
        page,
        el: dialog,
        name: `所属模型`,
        select: `xpath/.//i`,
        hint: `xpath/.//label[contains(., '所属模型')]/following-sibling::div`,
        popup: `xpath/.//div[contains(@class, 'el-select-dropdown')]/parent::div`,
        item: `xpath/.//ul/li/span[contains(., '${config.deviceModel}')]`,
      });
      this.logger.debug(
        `case ${config.name}: navigate and click on the model ${config.deviceModel} in dropdown 所属模型`
      );

      await input(
        dialog,
        `xpath/.//input`,
        `${config.faultName}`,
        `xpath/.//label[contains(., '故障名称')]/following-sibling::div`
      ).catch((e) => {
        throw new Error(`failed to type into input 故障名称`);
      });
      this.logger.debug(`case ${config.name}: type into input 故障名称`);

      await input(
        dialog,
        `xpath/.//input`,
        `${config.faultCode}`,
        `xpath/.//label[contains(.,'故障码')]/following-sibling::div`
      ).catch((e) => {
        throw new Error(`failed to type into input 故障码`);
      });
      this.logger.debug(`case ${config.name}: type into input 故障码`);

      await input(
        dialog,
        `xpath/.//textarea`,
        `${config.faultDesc}`,
        `xpath/.//label[contains(.,'描述')]/following-sibling::div`
      ).catch((e) => {
        throw new Error(`failed to type into input 描述`);
      });
      this.logger.debug(`case ${config.name}: type into input 描述`);

      await click(dialog, `xpath/.//button/span[text()='确认']`).catch((e) => {
        throw new Error(`fail to navigate to button 确认`);
      });
      this.logger.debug(
        `case ${config.name}: navigate and click on button 确认`
      );

      // await sleep(5000);

      await query(page, `xpath/.//span[text()='${config.faultCode}']`).catch(
        (e) => {
          throw new Error(`fail to verify the added record`);
        }
      );
      this.logger.debug(`case ${config.name}: verify the added record`);

      let [tr] = await query(
        page,
        `xpath/.//span[text()='${config.faultCode}']/ancestor::tr`
      ).catch((e) => {
        throw new Error(`fail to find the added record`);
      });
      this.logger.debug(`case ${config.name}: find the added record`);

      await click(
        tr,
        `xpath/.//div[contains(@class, 'dt-table-operation-button') and contains(., '编辑')]`
      ).catch((e) => {
        throw new Error(`fail to navigate and click on 编辑`);
      });
      this.logger.debug(
        `case ${config.name}: navigate and click on button 编辑`
      );

      [dialog] = await query(
        page,
        `xpath/.//header/span[contains(., '编辑故障码')]/parent::header/parent::div`
      ).catch((e) => {
        throw new Error(`fail to find dialog 编辑故障码`);
      });
      this.logger.debug(`case ${config.name}: find dialog 新增故障码`);

      await query(
        dialog,
        `xpath/.//div[contains(@class,'el-select')]/div[not(contains(@class,'is-disabled'))]`,
        `xpath/.//label[contains(.,'所属模型')]/following-sibling::div`
      ).catch((e) => {
        throw new Error(`fail to verify 所属模型 is editable`);
      });
      this.logger.debug(`case ${config.name}: verify 所属模型 is editable`);

      await click(dialog, `xpath/.//button/span[text()='取消']`).catch((e) => {
        throw new Error(`fail to navigate to button 取消`);
      });
      this.logger.debug(
        `case ${config.name}: navigate and click on button 取消`
      );

      await click(page, `xpath/.//span[text()='报警管理']`).catch((e) => {
        throw new Error(`fail to navigate to menu 报警管理`);
      });
      this.logger.debug(`case ${config.name}: navigate to menu 报警管理`);

      await click(page, `xpath/.//span[text()='报警规则']`).catch((e) => {
        throw new Error(`fail to navigate to menu 报警规则`);
      });
      this.logger.debug(`case ${config.name}: navigate to menu 报警规则`);

      await click(page, `xpath/.//span[text()='新增']`).catch((e) => {
        throw new Error(`fail to navigate and click on button 新增`);
      });
      this.logger.debug(
        `case ${config.name}: navigate and click on button 新增`
      );

      await input(
        page,
        `input[placeholder="请输入报警名称"]`,
        `${config.ruleName}`
      ).catch((e) => {
        throw new Error(`failed to type into input 报警名称`);
      });
      this.logger.debug(`case ${config.name}: type into input 报警名称`);

      await click(page, `xpath/.//span[text()='重要']`).catch((e) => {
        throw new Error(`fail to navigate and click on radio button 报警级别`);
      });
      this.logger.debug(
        `case ${config.name}: navigate and click on radio button 报警级别`
      );

      await click(page, `xpath/.//span[text()='按模型']`).catch((e) => {
        throw new Error(`fail to navigate and click on radio button 配置方式`);
      });
      this.logger.debug(
        `case ${config.name}: navigate and click on radio button 配置方式`
      );

      await dropdown({
        page,
        name: `选择模型`,
        select: `xpath/.//span[contains(., '请选择')]`,
        hint: `xpath/.//label[contains(., '选择模型')]/following-sibling::div`,
        popup: `xpath/.//div[contains(@class, 'el-select-dropdown')]/parent::div`,
        item: `xpath/.//ul/li/span[contains(., '${config.deviceModel}')]`,
      });
      this.logger.debug(
        `case ${config.name}: navigate and click on the model ${config.deviceModel} in dropdown 选择模型`
      );

      await dropdown({
        page,
        name: `关联故障码`,
        select: `xpath/.//span[contains(., '请选择')]`,
        hint: `xpath/.//label[contains(., '关联故障码')]/following-sibling::div`,
        popup: `xpath/.//div[contains(@class, 'el-select-dropdown')]/parent::div`,
        item: `xpath/.//ul/li/span[contains(., '${config.faultCode}')]`,
      });
      this.logger.debug(
        `case ${config.name}: navigate and click on the faultCode ${config.faultCode} in dropdown 关联故障码`
      );

      await dropdown({
        page,
        name: `属性`,
        select: `xpath/.//span[contains(., '请选择')]`,
        hint: `xpath/.//label[contains(., '属性')]/following-sibling::div`,
        popup: `xpath/.//div[contains(@class, 'el-select-dropdown')]/parent::div`,
        item: `xpath/.//ul/li/span[contains(., '${config.ruleProp}')]`,
      });
      this.logger.debug(
        `case ${config.name}: navigate and click on the property ${config.ruleProp} in dropdown 属性`
      );

      await dropdown({
        page,
        name: `操作符`,
        select: `xpath/.//span[contains(., '请选择')]`,
        hint: `xpath/.//label[contains(., '操作符')]/following-sibling::div`,
        popup: `xpath/.//div[contains(@class, 'el-select-dropdown')]/parent::div`,
        item: `xpath/.//ul/li/span[contains(., '${config.ruleOp}')]`,
      });
      this.logger.debug(
        `case ${config.name}: navigate and click on the property ${config.ruleOp} in dropdown 操作符`
      );

      await input(
        page,
        `xpath/.//input`,
        '10',
        `xpath/.//label[contains(., '条件值')]/following-sibling::div`
      ).catch((e) => {
        throw new Error(`failed to type into input 条件值`);
      });
      this.logger.debug(`case ${config.name}: type into input 条件值`);

      await click(page, `xpath/.//span[text()='仅报警一次']`).catch((e) => {
        throw new Error(`fail to navigate and click on radio button 通知频率`);
      });
      this.logger.debug(
        `case ${config.name}: navigate and click on radio button 通知频率`
      );

      await click(page, `xpath/.//button/span[text()='确认']`).catch((e) => {
        throw new Error(`fail to navigate to button 确认`);
      });
      this.logger.debug(
        `case ${config.name}: navigate and click on button 确认`
      );

      await query(page, `xpath/.//span[text()='${config.ruleName}']`).catch(
        (e) => {
          throw new Error(`fail to verify the added record ${config.ruleName}`);
        }
      );
      this.logger.debug(
        `case ${config.name}: verify the added record ${config.ruleName}`
      );

      await click(page, `xpath/.//span[text()='故障码管理']`).catch((e) => {
        throw new Error(`fail to navigate to menu 故障码管理`);
      });
      this.logger.debug(`case ${config.name}: navigate to menu 故障码管理`);

      [tr] = await query(
        page,
        `xpath/.//span[text()='${config.faultCode}']/ancestor::tr`
      ).catch((e) => {
        throw new Error(`fail to find the added record`);
      });
      this.logger.debug(`case ${config.name}: find the added record`);

      await click(
        tr,
        `xpath/.//div[contains(@class, 'dt-table-operation-button') and contains(., '编辑')]`
      ).catch((e) => {
        throw new Error(`fail to navigate and click on 编辑`);
      });
      this.logger.debug(
        `case ${config.name}: navigate and click on button 编辑`
      );

      [dialog] = await query(
        page,
        `xpath/.//header/span[contains(., '编辑故障码')]/parent::header/parent::div`
      ).catch((e) => {
        throw new Error(`fail to find dialog 编辑故障码`);
      });
      this.logger.debug(`case ${config.name}: find dialog 新增故障码`);

      await query(
        dialog,
        `xpath/.//div[contains(@class,'el-select')]/div[contains(@class,'is-disabled')]`,
        `xpath/.//label[contains(.,'所属模型')]/following-sibling::div`
      ).catch((e) => {
        throw new Error(`fail to verify 所属模型 is not editable`);
      });
      this.logger.debug(`case ${config.name}: verify 所属模型 is not editable`);

      await click(dialog, `xpath/.//button/span[text()='取消']`).catch((e) => {
        throw new Error(`fail to navigate to button 取消`);
      });
      this.logger.debug(
        `case ${config.name}: navigate and click on button 取消`
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
