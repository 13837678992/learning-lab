import { getToken } from '@/utils/auth';
import { logout } from '@/utils/logout';

var SESSION_TIMEOUT = 30 * 60 * 1000;
var CHECK_INTERVAL = 60 * 1000;
var lastActivity = Date.now();
var timer = null;

function resetActivity() {
  lastActivity = Date.now();
}

function checkSession() {
  if (!getToken()) {
    stop();
    return;
  }
  var now = Date.now();
  if (now - lastActivity > SESSION_TIMEOUT) {
    stop();
    logout();
  }
}

export function start() {
  if (timer) return;
  lastActivity = Date.now();
  document.addEventListener('mousemove', resetActivity);
  document.addEventListener('keydown', resetActivity);
  document.addEventListener('click', resetActivity);
  timer = setInterval(checkSession, CHECK_INTERVAL);
}

export function stop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  document.removeEventListener('mousemove', resetActivity);
  document.removeEventListener('keydown', resetActivity);
  document.removeEventListener('click', resetActivity);
}
