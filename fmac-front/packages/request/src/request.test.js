import { describe, it, expect, vi } from 'vitest';
import { createRequest } from './request.js';

const mockAdapter = (impl) => vi.fn(impl || (async (config) => ({ data: config })));

describe('createRequest', () => {
  it('get 组装 method/url/params，返回响应体 data', async () => {
    const adapter = mockAdapter(async (c) => ({ data: { url: c.url, method: c.method } }));
    const req = createRequest({ adapter });
    const data = await req.get('/u', { params: { a: 1 } });
    expect(data).toEqual({ url: '/u', method: 'GET' });
    expect(adapter.mock.calls[0][0].params).toEqual({ a: 1 });
  });

  it('post 携带 data', async () => {
    const adapter = mockAdapter(async (c) => ({ data: c.data }));
    const req = createRequest({ adapter });
    expect(await req.post('/u', { n: 1 })).toEqual({ n: 1 });
  });

  it('默认 baseURL/headers 合并；setBaseURL/setHeader 生效', async () => {
    const adapter = mockAdapter(async (c) => ({ data: c }));
    const req = createRequest({ adapter, baseURL: '/api', headers: { A: '1' } });
    req.setHeader('B', '2');
    req.setBaseURL('/gw');
    const c = await req.get('/x', { headers: { C: '3' } });
    expect(c.baseURL).toBe('/gw');
    expect(c.headers).toEqual({ A: '1', B: '2', C: '3' });
  });

  it('请求/响应拦截器按序执行并可改写', async () => {
    const adapter = mockAdapter(async (c) => ({ data: c.tag }));
    const req = createRequest({ adapter });
    req.useRequestInterceptor((c) => ({ ...c, tag: 'req' }));
    req.useResponseInterceptor((r) => ({ ...r, data: `${r.data}:res` }));
    expect(await req.get('/x')).toBe('req:res');
  });

  it('adapter 抛错时错误拦截器触发并重新抛出', async () => {
    const boom = new Error('net');
    const adapter = mockAdapter(async () => {
      throw boom;
    });
    const req = createRequest({ adapter });
    const onErr = vi.fn();
    req.useErrorInterceptor(onErr);
    await expect(req.get('/x')).rejects.toThrow('net');
    expect(onErr).toHaveBeenCalledTimes(1);
    expect(onErr.mock.calls[0][0]).toBe(boom);
  });

  it('createCancelToken 返回 signal 与 cancel', () => {
    const req = createRequest({ adapter: mockAdapter() });
    const token = req.createCancelToken();
    expect(typeof token.cancel).toBe('function');
  });
});
