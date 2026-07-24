/**
 * 轻量全局消息提示（不引入 element-ui 等重框架，见 CLAUDE.md 第七节「避免过重依赖」）。
 * 纯 DOM 实现，首次调用时注入样式。
 */
let styleInjected = false;

function ensureStyle() {
  if (styleInjected || typeof document === 'undefined') return;
  styleInjected = true;
  const style = document.createElement('style');
  style.textContent = `
  #fmac-message{position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:99999;display:flex;flex-direction:column;gap:8px;pointer-events:none}
  .fmac-message-item{min-width:200px;max-width:60vw;padding:10px 16px;border-radius:8px;color:#fff;font-size:14px;box-shadow:0 6px 20px rgba(0,0,0,.15);opacity:1;transition:opacity .3s,transform .3s}
  .fmac-message-item.is-leave{opacity:0;transform:translateY(-8px)}
  .fmac-message-info{background:#2f6bff}
  .fmac-message-success{background:#00a870}
  .fmac-message-warning{background:#e37318}
  .fmac-message-error{background:#d54941}`;
  document.head.appendChild(style);
}

function show(text, type) {
  if (typeof document === 'undefined') return;
  ensureStyle();
  let box = document.getElementById('fmac-message');
  if (!box) {
    box = document.createElement('div');
    box.id = 'fmac-message';
    document.body.appendChild(box);
  }
  const item = document.createElement('div');
  item.className = `fmac-message-item fmac-message-${type}`;
  item.textContent = text;
  box.appendChild(item);
  setTimeout(() => {
    item.classList.add('is-leave');
    setTimeout(() => {
      if (item.parentNode) item.parentNode.removeChild(item);
    }, 300);
  }, 2600);
}

export default {
  info: (text) => show(text, 'info'),
  success: (text) => show(text, 'success'),
  warning: (text) => show(text, 'warning'),
  error: (text) => show(text, 'error'),
};
