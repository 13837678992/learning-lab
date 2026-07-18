/**
 * @fmac/ui-adapter —— DOM 版全局 Loading 适配器（框架无关，零依赖）。
 *
 * 实现 @fmac/loading 期望的 { show, hide } 契约，由 @fmac/core 注入到 loading。
 * 本包是除自身外唯一允许依赖具体 UI 框架的 package；此处提供不含框架依赖的 DOM 实现。
 */
const STYLE_ID = 'fmac-loading-style';

const CSS = `
.fmac-loading-mask{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.6);}
.fmac-loading-spinner{width:36px;height:36px;border:3px solid #c9d2e3;border-top-color:#3b82f6;border-radius:50%;animation:fmac-spin .8s linear infinite;}
.fmac-loading-text{margin-left:12px;color:#334155;font-size:14px;}
@keyframes fmac-spin{to{transform:rotate(360deg);}}
`;

function ensureStyle(doc) {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  doc.head.appendChild(style);
}

export function createDomLoadingAdapter(target) {
  let mask = null;

  return {
    show(config = {}) {
      if (typeof document === 'undefined') return;
      ensureStyle(document);
      if (!mask) {
        mask = document.createElement('div');
        mask.className = 'fmac-loading-mask';
        const spinner = document.createElement('div');
        spinner.className = 'fmac-loading-spinner';
        mask.appendChild(spinner);
        if (config.text) {
          const text = document.createElement('span');
          text.className = 'fmac-loading-text';
          text.textContent = config.text;
          mask.appendChild(text);
        }
      }
      (target || document.body).appendChild(mask);
    },
    hide() {
      if (mask && mask.parentNode) mask.parentNode.removeChild(mask);
    },
  };
}
