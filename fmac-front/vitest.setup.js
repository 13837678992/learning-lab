import { vi, beforeAll, afterAll } from 'vitest';

/**
 * 能力包在告警/错误路径会经统一 logger 输出到 console；单测中静默以保持输出整洁。
 * 需断言日志的用例可在用例内自行 vi.spyOn(console, ...) 覆盖。
 */
beforeAll(() => {
  for (const level of ['debug', 'info', 'warn', 'error']) {
    vi.spyOn(console, level).mockImplementation(() => {});
  }
});

afterAll(() => {
  vi.restoreAllMocks();
});
