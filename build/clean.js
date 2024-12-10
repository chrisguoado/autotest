import path from 'path';
import fs from 'fs-extra';
import settings from './settings.js';

const outputDir = settings.outputDir || './dist';

async function main() {
  let exist = await fs.access(outputDir, fs.constants.F_OK).catch((err) => err);
  exist = !(exist instanceof Error);

  if (!exist) return;

  const regex = /(LICENSE[.]txt|^node_modules_puppeteer-core.*[.]js|js[.]map)$/;
  fs.readdirSync(outputDir)
    .filter((f) => regex.test(f))
    .map((f) => {
      // console.log(path.resolve(outputDir, f));
      fs.removeSync(path.resolve(outputDir, f));
      return null;
    });
}

main();
