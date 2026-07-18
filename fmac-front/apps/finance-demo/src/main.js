import './assets/finance.css';
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper';
import { renderStandalone } from './micro.js';

// qiankun 生命周期已在 micro.js 经 renderWithQiankun 注册；独立运行时手动渲染。
if (!qiankunWindow.__POWERED_BY_QIANKUN__) renderStandalone();
