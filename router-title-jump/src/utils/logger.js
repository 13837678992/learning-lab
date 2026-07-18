'use strict';

/**
 * 轻量日志器。
 *
 * 为什么这样设计：解析器 / 索引 / 搜索都是纯逻辑模块，需要能在**无 VSCode 宿主**的
 * node:test 环境里直接跑；所以日志默认落到 console，扩展激活时再通过 setSink 注入
 * VSCode OutputChannel。这样模块本身不 import vscode，可测试、可复用。
 *
 * startTimer 供 PERFORMANCE 阶段统计各环节耗时。
 */

/** @typedef {{ appendLine(line: string): void }} LogSink */

/** @type {LogSink | null} */
let sink = null;
let debugEnabled = false;

/**
 * 注入日志输出目标（通常是 vscode.OutputChannel）。
 * @param {LogSink | null} channel
 */
function setSink(channel) {
  sink = channel;
}

/**
 * 开关调试日志。
 * @param {boolean} enabled
 */
function setDebug(enabled) {
  debugEnabled = enabled;
}

/**
 * @param {string} message
 */
function write(message) {
  const line = `[router-jump] ${message}`;
  if (sink) {
    sink.appendLine(line);
  } else {
    console.log(line);
  }
}

/**
 * @param {string} message
 */
function info(message) {
  write(message);
}

/**
 * @param {string} message
 */
function debug(message) {
  if (debugEnabled) {
    write(`debug: ${message}`);
  }
}

/**
 * @param {string} message
 * @param {unknown} [err]
 */
function error(message, err) {
  const detail = err
    ? ` — ${err instanceof Error ? err.message : String(err)}`
    : '';
  write(`error: ${message}${detail}`);
}

/**
 * 计时辅助：返回一个「停止」函数，调用后返回经过的毫秒数并按需打调试日志。
 * @param {string} label
 * @returns {() => number}
 */
function startTimer(label) {
  const begin = process.hrtime.bigint();
  return () => {
    const ms = Number(process.hrtime.bigint() - begin) / 1e6;
    debug(`${label} took ${ms.toFixed(1)}ms`);
    return ms;
  };
}

module.exports = { setSink, setDebug, info, debug, error, startTimer };
