'use strict';

/**
 * 性能基准：生成一个大型合成项目，度量核心管线（解析 → 别名/文件解析 → 建索引 → 搜索）。
 * 不依赖 VSCode 宿主——findFiles 由宿主完成且很快，真正的成本在这条管线上。
 *
 * 用法：node scripts/bench.js [路由数=1000] [模块文件数=20]
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const { buildRecordsForFile } = require('../src/index/IndexBuilder');
const { RouterIndex } = require('../src/index/RouterIndex');
const { search } = require('../src/search/SearchEngine');
const { clearCache: clearAlias } = require('../src/resolver/AliasResolver');
const { clearCache: clearRoot } = require('../src/resolver/ProjectRootResolver');

const COUNT = Number(process.argv[2] || 1000);
const MODULES = Number(process.argv[3] || 20);

const TITLES = [
  '用户管理', '产品列表', '订单详情', '系统设置', '数据报表',
  '登录页面', '首页概览', '角色权限', '部门组织', '财务结算',
  '商品详情', '客户中心', '消息通知', '日志审计', '工作台',
  '保险产品', '银行卡片', '优惠券包', '积分商城', '个人中心',
];

/** @param {bigint} start */
function ms(start) {
  return Number(process.hrtime.bigint() - start) / 1e6;
}

/** @param {string} dir @returns {string[]} 路由模块文件列表 */
function generateProject(dir) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'bench' }));
  fs.writeFileSync(
    path.join(dir, 'tsconfig.json'),
    JSON.stringify({ compilerOptions: { baseUrl: '.', paths: { '@/*': ['src/*'] } } })
  );

  const routerDir = path.join(dir, 'src', 'router', 'modules');
  fs.mkdirSync(routerDir, { recursive: true });

  const perModule = Math.ceil(COUNT / MODULES);
  const routerFiles = [];
  let idx = 0;

  for (let m = 0; m < MODULES; m++) {
    const entries = [];
    for (let j = 0; j < perModule && idx < COUNT; j++, idx++) {
      const vuePath = path.join(dir, 'src', 'views', `mod${m}`, `page${idx}.vue`);
      fs.mkdirSync(path.dirname(vuePath), { recursive: true });
      fs.writeFileSync(vuePath, '<template><div/></template>\n');
      const title = TITLES[idx % TITLES.length] + idx;
      entries.push(
        `  { path: '/m${m}/p${idx}', meta: { title: '${title}' }, component: () => import('@/views/mod${m}/page${idx}.vue') }`
      );
    }
    const file = path.join(routerDir, `mod${m}.js`);
    fs.writeFileSync(file, `export default [\n${entries.join(',\n')}\n];\n`);
    routerFiles.push(file);
  }
  return routerFiles;
}

function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rtj-bench-'));
  try {
    const routerFiles = generateProject(dir);
    clearAlias();
    clearRoot();

    const index = new RouterIndex();

    // 首次全量扫描（解析 + 解析文件 + 建索引）
    const scanStart = process.hrtime.bigint();
    for (const rf of routerFiles) {
      const code = fs.readFileSync(rf, 'utf8');
      index.replaceRouterFile(rf, buildRecordsForFile(code, rf, dir));
    }
    const firstScanMs = ms(scanStart);

    // 搜索延迟（每个查询跑 50 次取均值）
    const queries = ['产品', 'cp', 'chanpin', 'user', '/m1', 'page5', 'yonghu', 'baoxian'];
    const searchTimes = {};
    for (const q of queries) {
      const s = process.hrtime.bigint();
      let hits = 0;
      for (let i = 0; i < 50; i++) hits = search(index, q).length;
      searchTimes[q] = { avgMs: Number((ms(s) / 50).toFixed(3)), hits };
    }

    // 增量：重扫单个模块文件
    const rf0 = routerFiles[0];
    const incStart = process.hrtime.bigint();
    const code0 = fs.readFileSync(rf0, 'utf8');
    index.replaceRouterFile(rf0, buildRecordsForFile(code0, rf0, dir));
    const incrementalMs = ms(incStart);

    console.log(
      JSON.stringify(
        {
          routes: COUNT,
          moduleFiles: MODULES,
          indexSize: index.size(),
          firstScanMs: Number(firstScanMs.toFixed(1)),
          perRouteUs: Number(((firstScanMs / COUNT) * 1000).toFixed(1)),
          incrementalMs: Number(incrementalMs.toFixed(2)),
          searchTimes,
        },
        null,
        2
      )
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

main();
