#!/usr/bin/env node
//! Renders the README demo card from real command output.
//!
//! 用真实命令输出重画 README 的演示卡片。
//!
//! What it runs (no network; node + python only):
//!   python scripts/check_manifests.py   — layer manifest gate · 层清单闸门
//!   python scripts/check_numbers.py     — doc number guard · 文档数字守卫
//!   node --test <every *.test.mjs>      — JS mirror tests · 浏览器内核镜像测试
//!
//! Determinism notes / 确定性约定:
//!   - timings, durations and absolute paths are never drawn;
//!   - backslashes are normalised to `/`, so Windows and Linux emit one file;
//!   - no <script> and no inline `style=` (GitHub strips both): per-line
//!     animation delays live in generated CSS classes instead.

import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const OUT = join(ROOT, 'assets', 'demo', 'verify.svg');

const WIDTH = 880;
const FONT = 14.5;
const LINE = 26;
const PAD_X = 24;
const HEAD = 46;
const FOOT = 30;
const MAX_CELLS = 90;

// ── helpers ───────────────────────────────────────────────────────────────

/** Resolve the python launcher for this host. 找到本机的 python 启动方式。 */
function pythonCmd() {
  const candidates =
    process.platform === 'win32'
      ? [['python'], ['py', '-3']]
      : [['python3'], ['python']];
  for (const [cmd, ...pre] of candidates) {
    const probe = spawnSync(cmd, [...pre, '--version'], { encoding: 'utf8' });
    if (probe.status === 0) return [cmd, ...pre];
  }
  throw new Error('python not found on PATH');
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith('.test.mjs')) out.push(full);
  }
  return out;
}

function run(cmd, args) {
  const res = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
  });
  if (res.error) throw res.error;
  return { code: res.status ?? 1, out: `${res.stdout || ''}${res.stderr || ''}` };
}

/** Normalise one captured line: no timings, no absolute paths, forward slashes. */
function clean(text) {
  return text
    .replace(/\r/g, '')
    .split('\n')
    .map((line) =>
      line
        .replace(/\(\d+(?:\.\d+)?m?s\)/g, '') // (12.34ms) → ''
        .replace(/\b\d+(?:\.\d+)?m?s\b/g, '') // 12.34ms → ''
        .replaceAll(ROOT, '<repo>')
        .replaceAll(ROOT.split(sep).join('/'), '<repo>')
        .replace(/\\/g, '/')
        .replace(/\s+$/g, '')
    );
}

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Display width in monospace cells (CJK counts as two). 等宽格数，中文算两格。 */
function cells(s) {
  let n = 0;
  for (const ch of s) {
    n += /[\u1100-\u115f\u2e80-\u303e\u3041-\u33ff\u3400-\u4dbf\u4e00-\u9fff\uff00-\uff60]/.test(ch) ? 2 : 1;
  }
  return n;
}

/** Wrap a line to fit the card. 按显示宽度折行。 */
function wrap(text, maxCells) {
  if (cells(text) <= maxCells) return [text];
  const rows = [];
  let cur = '';
  let width = 0;
  for (const ch of text) {
    const w = cells(ch);
    if (width + w > maxCells && cur) {
      rows.push(cur);
      cur = '';
      width = 0;
    }
    cur += ch;
    width += w;
  }
  if (cur) rows.push(cur);
  return rows;
}

// ── collect real output ───────────────────────────────────────────────────

const py = pythonCmd();
const lines = [];
let failures = 0;

function add(kind, text) {
  for (const row of wrap(text, MAX_CELLS)) lines.push({ kind, text: row });
}

function step(cmdline, argv) {
  add('cmd', `$ ${cmdline}`);
  const { code, out } = run(argv[0], argv.slice(1));
  const body = clean(out).filter((l) => l.trim().length > 0).slice(0, 3);
  for (const line of body) add(code === 0 ? 'out' : 'fail', line);
  if (code !== 0) failures += 1;
}

// 1) layer manifest gate · 层清单闸门
step('python scripts/check_manifests.py', [...py, 'scripts/check_manifests.py']);

// 2) doc number guard · 文档数字守卫
step('python scripts/check_numbers.py', [...py, 'scripts/check_numbers.py']);

// 3) JS mirror tests · 浏览器内核镜像测试
const tests = walk(ROOT).sort((a, b) => a.localeCompare(b));
add('cmd', `$ node --test  # ${tests.length} files under examples/ + platforms/`);
{
  // --test-reporter=spec keeps the summary stable: node prints TAP when piped.
  const { code, out } = run(process.execPath, ['--test', '--test-reporter=spec', ...tests]);
  const pick = (key) => {
    const m = out.match(new RegExp(`^[ℹ#]\\s*${key}\\s+(\\d+)`, 'm'));
    return m ? m[1] : '?';
  };
  const totals = ['tests', 'pass', 'fail', 'skipped'].map((k) => `${k} ${pick(k)}`);
  add(code === 0 ? 'pass' : 'fail', `ℹ ${totals.join('   ')}`);
  if (code !== 0) failures += 1;
}

add('dim', '');
add(
  failures === 0 ? 'pass' : 'fail',
  failures === 0
    ? '✔ 3/3 通过 · 全部离线执行 / all three passed, no network'
    : `✖ ${failures} 项未通过，照实画 / ${failures} failed, drawn as-is`
);

// ── render ────────────────────────────────────────────────────────────────

const height = HEAD + lines.length * LINE + FOOT;
const delays = lines
  .map((_, i) => `.d${i}{animation-delay:${(0.06 + i * 0.085).toFixed(2)}s}`)
  .join('');

const body = lines
  .map((line, i) => {
    const y = HEAD + i * LINE;
    return `<text class="${line.kind} d${i}" x="${PAD_X}" y="${y + FONT}">${esc(line.text)}</text>`;
  })
  .join('\n');

const version =
  (readFileSync(join(ROOT, 'Cargo.toml'), 'utf8').match(/^version\s*=\s*"([^"]+)"/m) || [])[1] || '';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" role="img" aria-label="OriEra verification card: layer manifest gate, doc number guard and JS mirror tests, all passing">
<title>OriEra verification · 三项自检</title>
<style>
  text{font-family:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,"Liberation Mono","Noto Sans Mono CJK SC",monospace;font-size:${FONT}px;white-space:pre}
  .cmd,.out,.pass,.fail,.dim{opacity:0;animation:in .34s ease-out forwards}
  .cmd{fill:#7ee787}
  .out{fill:#9aa4b2}
  .pass{fill:#7ee787}
  .fail{fill:#ff7b72}
  .dim{fill:#6e7681}
  .tab{fill:#8b949e;font-size:12px}
  @keyframes in{from{opacity:0}to{opacity:1}}
  .cursor{animation:blink 1.1s steps(1) infinite}
  @keyframes blink{0%,49%{opacity:.85}50%,100%{opacity:0}}
  @media (prefers-reduced-motion: reduce){.cmd,.out,.pass,.fail,.dim{animation:none;opacity:1}.cursor{animation:none}}
  ${delays}
</style>
<rect x="0" y="0" width="${WIDTH}" height="${height}" rx="12" fill="#0d1117"/>
<path d="M0 12a12 12 0 0 1 12-12h${WIDTH - 24}a12 12 0 0 1 12 12v${HEAD - 14}H0z" fill="#161b22"/>
<line x1="0" y1="${HEAD - 8}" x2="${WIDTH}" y2="${HEAD - 8}" stroke="#30363d"/>
<circle cx="21" cy="19" r="5" fill="#ff5f57"/><circle cx="39" cy="19" r="5" fill="#febc2e"/><circle cx="57" cy="19" r="5" fill="#28c840"/>
<text class="tab" x="${PAD_X + 52}" y="23">verify · 3 commands · 在仓库根目录执行</text>
<text class="tab" x="${WIDTH - PAD_X}" y="23" text-anchor="end">OriEra ${version}</text>
${body}
<rect class="cursor" x="${PAD_X}" y="${HEAD + (lines.length - 1) * LINE - 14}" width="8" height="15" rx="1" fill="#7ee787"/>
<rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${height - 1}" rx="12" fill="none" stroke="#30363d"/>
</svg>
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, svg, 'utf8');
console.log(`wrote ${relative(ROOT, OUT).split(sep).join('/')}  ${lines.length} lines, ${height}px tall`);
console.log('--- card content / 卡片内容 ---');
for (const line of lines) console.log(`${line.kind.padEnd(4)} ${line.text}`);
if (failures > 0) process.exit(1);
