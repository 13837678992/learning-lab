import { describe, it, expect, vi } from 'vitest';
import { createErrorHandler, ErrorTypes } from './error-handler.js';

describe('createErrorHandler', () => {
  it('normalize 非 Error 输入为 Error，并带 type/meta/time', () => {
    const eh = createErrorHandler();
    const p = eh.handle('route', 'oops', { url: '/x' });
    expect(p.type).toBe('route');
    expect(p.error).toBeInstanceOf(Error);
    expect(p.message).toBe('oops');
    expect(p.meta).toEqual({ url: '/x' });
    expect(typeof p.time).toBe('number');
  });

  it('分类便捷入口设置对应 type', () => {
    const eh = createErrorHandler();
    expect(eh.micro(new Error('a')).type).toBe(ErrorTypes.MICRO);
    expect(eh.route(new Error('a')).type).toBe(ErrorTypes.ROUTE);
    expect(eh.request(new Error('a')).type).toBe(ErrorTypes.REQUEST);
    expect(eh.auth(new Error('a')).type).toBe(ErrorTypes.AUTH);
    expect(eh.lifecycle(new Error('a')).type).toBe(ErrorTypes.LIFECYCLE);
  });

  it('注册处理器接收 payload；register 返回取消函数', () => {
    const eh = createErrorHandler();
    const handler = vi.fn();
    const off = eh.register(handler);
    eh.handle('unknown', new Error('e'));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].message).toBe('e');
    off();
    eh.handle('unknown', new Error('e2'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('处理器自身抛错被隔离', () => {
    const eh = createErrorHandler();
    eh.register(() => {
      throw new Error('handler-bug');
    });
    expect(() => eh.handle('micro', new Error('e'))).not.toThrow();
  });
});
