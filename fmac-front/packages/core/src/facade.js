/**
 * @fmac/core —— 能力门面：聚合各 package 单例，业务通过 core 统一访问，
 * 不直接依赖下层能力 package（见 CLAUDE.md 第六节）。
 */
import event from '@fmac/event';
import request from '@fmac/request';
import router from '@fmac/router';
import store from '@fmac/store';
import loading from '@fmac/loading';
import message from '@fmac/message';
import cache from '@fmac/cache';
import auth from '@fmac/auth';
import tab from '@fmac/tab';

/** 平台能力集合（不含 core 自身与 qiankun）。 */
export const capabilities = {
  event,
  request,
  router,
  store,
  loading,
  message,
  cache,
  auth,
  tab,
};
