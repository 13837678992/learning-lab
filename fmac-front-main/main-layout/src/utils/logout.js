import { removeToken } from './auth';
import store from '../store';
import { stop as stopSession } from '../platform/session';
import { notifyLogout } from '../platform/bridge';

export function logout() {
  notifyLogout();
  stopSession();
  removeToken();
  store.commit('CLEAR_USER');
  window.location.href = '/login';
}
