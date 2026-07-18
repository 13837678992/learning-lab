import { request } from '../platform.js';

/**
 * 财务系统模拟接口层。真实项目统一走 @fmac/core 的 request（禁止 axios/fetch）。
 * 本地无后端时，捕获请求失败并回退到模拟数据，保证 UI 可用（异常处理演示）。
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const MOCK_ACCOUNTS = [
  { id: 'A001', name: '基本存款账户', bank: '招商银行', balance: 1286400, currency: 'CNY' },
  { id: 'A002', name: '外币结算账户', bank: '中国银行', balance: 84200, currency: 'USD' },
  { id: 'A003', name: '备用金账户', bank: '工商银行', balance: 52000, currency: 'CNY' },
];

const MOCK_TX = [
  { id: 'T20260701', date: '2026-07-01', type: 'in', amount: 128000, counterparty: '华东贸易' },
  { id: 'T20260703', date: '2026-07-03', type: 'out', amount: 32000, counterparty: '云服务商' },
  { id: 'T20260709', date: '2026-07-09', type: 'in', amount: 56000, counterparty: '华南电子' },
  { id: 'T20260712', date: '2026-07-12', type: 'out', amount: 8800, counterparty: '办公采购' },
];

const MOCK_REPORT = {
  income: 184000,
  expense: 40800,
  net: 143200,
  months: [
    { m: '05', income: 120000, expense: 30000 },
    { m: '06', income: 160000, expense: 42000 },
    { m: '07', income: 184000, expense: 40800 },
  ],
};

export async function fetchAccounts() {
  try {
    return await request.get('/accounts');
  } catch {
    await delay(200);
    return MOCK_ACCOUNTS;
  }
}

export async function fetchTransactions(params = {}) {
  try {
    return await request.get('/transactions', { params });
  } catch {
    await delay(300);
    let list = MOCK_TX;
    if (params.keyword) list = list.filter((t) => t.counterparty.includes(params.keyword));
    if (params.type && params.type !== 'all') list = list.filter((t) => t.type === params.type);
    return list;
  }
}

export async function fetchReport() {
  try {
    return await request.get('/report/summary');
  } catch {
    await delay(200);
    return MOCK_REPORT;
  }
}
