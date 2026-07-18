import { describe, it, expect, vi } from 'vitest';
import { createTabManager } from './tab.js';

describe('createTabManager', () => {
  it('add 去重并激活，subscribe 收到变更', () => {
    const tab = createTabManager();
    const sub = vi.fn();
    tab.subscribe(sub);
    tab.add({ key: '/a', title: 'A', path: '/a' });
    tab.add({ key: '/a', title: 'A', path: '/a' }); // 重复 key 复用
    expect(tab.list()).toHaveLength(1);
    expect(tab.getActive().key).toBe('/a');
    expect(sub).toHaveBeenCalled();
  });

  it('remove 当前激活项后自动激活相邻标签', () => {
    const tab = createTabManager();
    tab.add({ key: '/a', title: 'A' });
    tab.add({ key: '/b', title: 'B' });
    tab.setActive('/a');
    tab.remove('/a');
    expect(tab.find('/a')).toBeNull();
    expect(tab.getActive().key).toBe('/b');
  });

  it('closeOthers 保留目标与不可关闭项', () => {
    const tab = createTabManager();
    tab.add({ key: '/a', title: 'A' });
    tab.add({ key: '/b', title: 'B' });
    tab.add({ key: '/home', title: 'Home', closable: false });
    tab.closeOthers('/a');
    expect(
      tab
        .list()
        .map((t) => t.key)
        .sort(),
    ).toEqual(['/a', '/home']);
  });

  it('clear 只关闭可关闭项', () => {
    const tab = createTabManager();
    tab.add({ key: '/a', title: 'A' });
    tab.add({ key: '/home', title: 'Home', closable: false });
    tab.clear();
    expect(tab.list().map((t) => t.key)).toEqual(['/home']);
  });

  it('缺 key 与 path 的标签被忽略', () => {
    const tab = createTabManager();
    expect(tab.add({ title: 'x' })).toBeNull();
    expect(tab.list()).toHaveLength(0);
  });
});
