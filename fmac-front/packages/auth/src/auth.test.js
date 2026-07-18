import { describe, it, expect, vi } from 'vitest';
import { createAuth } from './auth.js';

describe('createAuth', () => {
  it('setToken 改变登录态并通知 onChange', () => {
    const auth = createAuth();
    const sub = vi.fn();
    auth.onChange(sub);
    expect(auth.isLogged()).toBe(false);
    auth.setToken('t');
    expect(auth.isLogged()).toBe(true);
    expect(auth.getToken()).toBe('t');
    expect(sub).toHaveBeenCalledWith(expect.objectContaining({ logged: true }));
  });

  it('权限 / 角色判断', () => {
    const auth = createAuth({ permissions: ['order:read'], roles: ['admin'] });
    expect(auth.hasPermission('order:read')).toBe(true);
    expect(auth.hasPermission('order:write')).toBe(false);
    expect(auth.hasRole('admin')).toBe(true);
    expect(auth.hasRole('guest')).toBe(false);
  });

  it('logout 清空登录态与用户', () => {
    const auth = createAuth({ token: 't', user: { id: 1 } });
    expect(auth.isLogged()).toBe(true);
    auth.logout();
    expect(auth.isLogged()).toBe(false);
    expect(auth.getUser()).toBeNull();
  });

  it('snapshot 返回当前态副本', () => {
    const auth = createAuth({ token: 't', permissions: ['a'] });
    expect(auth.snapshot()).toMatchObject({ token: 't', logged: true, permissions: ['a'] });
  });
});
