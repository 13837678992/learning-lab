export function showMessage(text, type = 'info') {
  const msg = document.createElement('div');
  msg.textContent = text;
  msg.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 10px 24px;
    background: ${type === 'error' ? '#f56c6c' : type === 'success' ? '#67c23a' : '#409eff'};
    color: #fff;
    border-radius: 4px;
    font-size: 14px;
    z-index: 99999;
    box-shadow: 0 2px 12px rgba(0,0,0,0.15);
    transition: opacity 0.3s;
  `;
  document.body.appendChild(msg);
  setTimeout(() => {
    msg.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(msg);
    }, 300);
  }, 3000);
}
