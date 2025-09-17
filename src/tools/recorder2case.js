import fs from 'fs-extra';
import path from 'path';
import nopt from '../../lib/js/util/nopt.js';

function help() {
  console.log('');
  console.log('Usage:');
  console.log('  $ node src/tools/recorder2case.js -i <recording.json> [-p project] [-n name] [-o outDir] [-u url]');
  console.log('');
  console.log('Options:');
  console.log('  -i, --input      path to Chrome DevTools Recorder JSON export (required)');
  console.log('  -p, --project    test project name (default: from recording title or filename)');
  console.log('  -n, --name       case name (default: from recording title or filename)');
  console.log('  -o, --outDir     output base dir for cases (default: src/cases)');
  console.log('  -u, --url        override entry URL (default: first navigate step)');
  console.log('  -s, --selector   preferred selector type: css|xpath|auto (default: auto)');
  console.log('  -?, -h, --help   show this help');
  process.exit(1);
}

const knownOpts = {
  input: path,
  project: String,
  name: String,
  outDir: path,
  url: String,
  selector: ['css', 'xpath', 'auto'],
  help: Boolean,
};

const shortHands = {
  i: ['--input'],
  p: ['--project'],
  n: ['--name'],
  o: ['--outDir'],
  u: ['--url'],
  s: ['--selector'],
  h: ['--help'],
  '?': ['--help'],
};

const options = nopt(knownOpts, shortHands, process.argv, 2, {
  help,
  remainValidate: () => true,
});

if (options.help) help();
if (!options.input) help();

function sanitizeName(name, fallback = 'case') {
  return (name || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/gi, '_')
    .replace(/^_+|_+$/g, '') || fallback;
}

function pickFirstNavigateUrl(steps) {
  for (const step of steps || []) {
    if (step?.type === 'navigate' && step?.url) return step.url;
    const nav = (step?.assertedEvents || []).find((e) => e?.type === 'navigation' && e?.url);
    if (nav?.url) return nav.url;
  }
  return undefined;
}

function flattenSelectors(step) {
  // step.selectors can be an array of arrays; flatten to a list of strings
  const raw = step?.selectors || [];
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const entry of raw) {
    if (Array.isArray(entry)) {
      for (const s of entry) if (typeof s === 'string') out.push(s);
    } else if (typeof entry === 'string') out.push(entry);
  }
  // Prefer explicit step.selector if present
  if (typeof step?.selector === 'string') out.unshift(step.selector);
  return out;
}

function chooseSelector(step, preferred = 'auto') {
  const list = flattenSelectors(step);
  if (!list.length) return undefined;
  const byType = {
    xpath: list.find((s) => /^xpath\//i.test(s)),
    css: list.find((s) => !/^aria\//i.test(s) && !/^pierce\//i.test(s) && !/^xpath\//i.test(s)),
    aria: list.find((s) => /^aria\//i.test(s)),
  };
  if (preferred === 'xpath' && byType.xpath) return byType.xpath;
  if (preferred === 'css' && byType.css) return byType.css;
  return byType.css || byType.xpath || list[0];
}

function needsNavigationWait(step) {
  return (step?.assertedEvents || []).some((e) => e?.type === 'navigation');
}

function escapeJsString(s) {
  return JSON.stringify(String(s));
}

function generateCaseCode({ project, name, description, entryUrl, steps, preferredSelector }) {
  const body = [];
  let skippedFirstNavigate = false;

  for (const step of steps || []) {
    switch (step?.type) {
      case 'navigate': {
        if (!skippedFirstNavigate) {
          // autotest will navigate to entries[0].url before run()
          skippedFirstNavigate = true;
        } else if (step.url) {
          body.push(`  await page.goto(${escapeJsString(step.url)}, { waitUntil: 'networkidle2' });`);
        }
        break;
      }
      case 'click': {
        const sel = chooseSelector(step, preferredSelector);
        if (!sel) break;
        const waitNav = needsNavigationWait(step);
        body.push(`  await this.utils.page.click(page, ${escapeJsString(sel)}, ${waitNav ? 'true' : 'false'});`);
        break;
      }
      case 'change': {
        const sel = chooseSelector(step, preferredSelector);
        const value = step?.value ?? step?.text ?? '';
        if (!sel) break;
        body.push(`  await this.utils.page.input(page, ${escapeJsString(sel)}, ${escapeJsString(value)});`);
        break;
      }
      case 'keydown':
      case 'keyup':
      case 'keyPress': {
        const key = step?.key ?? step?.value;
        if (key) body.push(`  await page.keyboard.press(${escapeJsString(key)});`);
        break;
      }
      case 'hover': {
        const sel = chooseSelector(step, preferredSelector);
        if (!sel) break;
        body.push(`  await this.utils.page.hover(page, ${escapeJsString(sel)});`);
        break;
      }
      case 'waitForElement': {
        const sel = chooseSelector(step, preferredSelector);
        if (!sel) break;
        body.push(`  await page.waitForSelector(${escapeJsString(sel)});`);
        break;
      }
      default: {
        // Fallback: try click if selector exists
        const sel = chooseSelector(step, preferredSelector);
        if (sel) body.push(`  await this.utils.page.click(page, ${escapeJsString(sel)}, false);`);
      }
    }
  }

  const lines = [];
  lines.push(`export const config = {`);
  lines.push(`  project: ${escapeJsString(project)},`);
  lines.push(`  name: ${escapeJsString(name)},`);
  lines.push(`  description: ${escapeJsString(description || name)},`);
  lines.push(`  entries: [{ url: ${escapeJsString(entryUrl)} }],`);
  lines.push(`};`);
  lines.push('');
  lines.push(`export async function run(page, crawl, option) {`);
  lines.push(...body);
  lines.push('');
  lines.push(`  return {`);
  lines.push(`    case: { project: config.project, name: config.name, description: config.description, status: 'PASS' },`);
  lines.push(`  };`);
  lines.push(`}`);
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const inFile = path.resolve(options.input);
  const outDir = path.resolve(options.outDir || 'src/cases');

  const raw = await fs.readFile(inFile, 'utf8');
  let recording;
  try {
    recording = JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse JSON:', e.message);
    process.exit(1);
  }

  // Normalize various export shapes
  let steps = [];
  let title = undefined;
  if (Array.isArray(recording)) {
    const rec = recording.find((r) => r && (r.steps || r.recording?.steps));
    steps = rec?.steps || rec?.recording?.steps || [];
    title = rec?.title || rec?.name;
  } else if (recording?.steps) {
    steps = recording.steps;
    title = recording.title || recording.name;
  } else if (recording?.recording?.steps) {
    steps = recording.recording.steps;
    title = recording.recording.title || recording.recording.name;
  }

  if (!steps?.length) {
    console.error('No steps found in recording JSON.');
    process.exit(1);
  }

  const entryUrl = options.url || pickFirstNavigateUrl(steps) || '';
  if (!entryUrl) {
    console.error('Unable to determine entry URL. Use --url to specify it.');
    process.exit(1);
  }

  const baseName = sanitizeName(options.name || title || path.parse(inFile).name);
  const project = sanitizeName(options.project || 'recording');
  const preferredSelector = (options.selector || 'auto').toLowerCase();

  const code = generateCaseCode({
    project,
    name: baseName,
    description: title || baseName,
    entryUrl,
    steps,
    preferredSelector,
  });

  const caseDir = path.join(outDir, project);
  const outPath = path.join(caseDir, `${baseName}.js`);
  await fs.ensureDir(caseDir);
  await fs.writeFile(outPath, code, 'utf8');

  console.log(`Generated case: ${outPath}`);
}

main();

