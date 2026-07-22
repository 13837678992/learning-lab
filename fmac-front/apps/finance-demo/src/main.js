import './public-path.js';
import './assets/finance.css';
import { bootstrap, mount, unmount, renderStandalone, POWERED } from './micro.js';

// 独立运行时直接渲染；qiankun 环境下由基座调用下方导出的生命周期。
if (!POWERED) renderStandalone();

// 导出 qiankun 标准生命周期（webpack UMD → window['app-finance-demo']；不直接引用 qiankun）。
export { bootstrap, mount, unmount };
