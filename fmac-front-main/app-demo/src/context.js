var actions = null;

export function setActions(a) {
  actions = a;
}

export function getActions() {
  return actions;
}

export function navigateTo(path) {
  if (actions && actions.setGlobalState) {
    actions.setGlobalState({ action: 'route', path: path });
  }
}

export function requestRefresh() {
  if (actions && actions.setGlobalState) {
    actions.setGlobalState({ action: 'refresh' });
  }
}

export function requestLogout() {
  if (actions && actions.setGlobalState) {
    actions.setGlobalState({ action: 'logout' });
  }
}
