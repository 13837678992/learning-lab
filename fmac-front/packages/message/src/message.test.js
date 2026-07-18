import { describe, it, expect, vi } from 'vitest';
import { createMessage } from './message.js';

describe('createMessage', () => {
  it('success/error/warning/info 委托 adapter.show 并带 type', () => {
    const adapter = { show: vi.fn(), confirm: vi.fn() };
    const m = createMessage({ adapter });
    m.success('ok');
    m.error('bad');
    m.warning('warn');
    m.info('fyi');
    expect(adapter.show).toHaveBeenCalledTimes(4);
    expect(adapter.show.mock.calls.map((c) => c[0])).toEqual([
      'success',
      'error',
      'warning',
      'info',
    ]);
    expect(adapter.show.mock.calls[0][1]).toBe('ok');
  });

  it('confirm 接受字符串或对象，返回 Promise<boolean>', async () => {
    const adapter = { show: vi.fn(), confirm: vi.fn(() => Promise.resolve(true)) };
    const m = createMessage({ adapter });
    await expect(m.confirm('删除？')).resolves.toBe(true);
    expect(adapter.confirm).toHaveBeenCalledWith({ content: '删除？' });
    await m.confirm({ content: 'x', title: 't' });
    expect(adapter.confirm).toHaveBeenLastCalledWith({ content: 'x', title: 't' });
  });

  it('setAdapter 注入自定义适配器', () => {
    const m = createMessage();
    const adapter = { show: vi.fn() };
    m.setAdapter(adapter);
    m.success('x');
    expect(adapter.show).toHaveBeenCalled();
  });

  it('adapter 未实现 confirm 时回退 true', async () => {
    const m = createMessage({ adapter: { show: vi.fn() } });
    await expect(m.confirm('x')).resolves.toBe(true);
  });
});
