/**
 * @fmac/ui-adapter —— DOM 版消息提示适配器（框架无关，零依赖）。
 *
 * 实现 @fmac/message 期望的 { show, confirm } 契约，由 @fmac/core 注入到 message。
 */
const STYLE_ID = 'fmac-message-style';

const COLORS = {
  success: '#16a34a',
  error: '#dc2626',
  warning: '#d97706',
  info: '#2563eb',
};

const CSS = `
.fmac-message-container{position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:10000;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none;}
.fmac-message-item{min-width:200px;max-width:60vw;padding:10px 16px;border-radius:6px;background:#fff;box-shadow:0 4px 16px rgba(0,0,0,.12);color:#1f2937;font-size:14px;border-left:4px solid #2563eb;animation:fmac-msg-in .2s ease;}
@keyframes fmac-msg-in{from{opacity:0;transform:translateY(-8px);}to{opacity:1;transform:none;}}
`;

function ensureStyle(doc) {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  doc.head.appendChild(style);
}

function ensureContainer(doc) {
  let container = doc.querySelector('.fmac-message-container');
  if (!container) {
    container = doc.createElement('div');
    container.className = 'fmac-message-container';
    doc.body.appendChild(container);
  }
  return container;
}

export function createDomMessageAdapter() {
  return {
    show(type, content, config = {}) {
      if (typeof document === 'undefined') return;
      ensureStyle(document);
      const container = ensureContainer(document);
      const item = document.createElement('div');
      item.className = 'fmac-message-item';
      item.style.borderLeftColor = COLORS[type] || COLORS.info;
      item.textContent = content === null || content === undefined ? '' : String(content);
      container.appendChild(item);
      const duration = config.duration === undefined ? 3000 : config.duration;
      setTimeout(() => {
        if (item.parentNode) item.parentNode.removeChild(item);
      }, duration);
    },
    confirm(options = {}) {
      // 零依赖 DOM 实现下以原生 confirm 兜底；接入 ElementUI 时由对应适配器替换。
      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        return Promise.resolve(window.confirm(options.content || '确认执行该操作？'));
      }
      return Promise.resolve(true);
    },
  };
}
