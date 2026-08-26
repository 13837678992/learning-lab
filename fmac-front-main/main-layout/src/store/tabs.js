import Vue from 'vue';

var TABS_STORAGE_KEY = 'fmac_tabs';
var REDIRECT_STORAGE_KEY = 'fmac_redirect';

function generateTabId(route) {
  var id = route.path;
  if (route.query && Object.keys(route.query).length > 0) {
    id += '?' + Object.keys(route.query).sort().map(function(k) {
      return k + '=' + route.query[k];
    }).join('&');
  }
  return id;
}

function getKeepNames(views) {
  var names = [];
  views.forEach(function(v) {
    if (v.keepAlive && v.name) names.push(v.name);
  });
  return names;
}

function rebuildCache(commit, views) {
  commit('CLEAR_CACHED_VIEWS');
  getKeepNames(views).forEach(function(n) { commit('ADD_CACHED_VIEW', n); });
}

function serializeViews(views) {
  return views.map(function(v) {
    return {
      id: v.id,
      title: v.title,
      path: v.path,
      fullPath: v.fullPath,
      name: v.name,
      params: v.params || {},
      query: v.query || {},
      closable: v.closable,
      keepAlive: v.keepAlive,
      isSubApp: v.isSubApp
    };
  });
}

var state = {
  visitedViews: [],
  cachedViews: [],
  routerViewState: true
};

var mutations = {
  ADD_VISITED_VIEW: function(state, view) {
    var exists = state.visitedViews.some(function(v) { return v.path === view.path; });
    if (!exists) {
      state.visitedViews.push(Object.assign({}, view));
    }
  },
  REMOVE_VISITED_VIEW: function(state, view) {
    state.visitedViews = state.visitedViews.filter(function(v) { return v.path !== view.path; });
  },
  SET_VISITED_VIEWS: function(state, views) {
    state.visitedViews = views;
  },
  REORDER_VISITED_VIEWS: function(state, payload) {
    var views = state.visitedViews.slice();
    var from = payload.from;
    var to = payload.to;
    if (from < 0 || to < 0 || from >= views.length || to >= views.length) return;
    var item = views.splice(from, 1)[0];
    views.splice(to, 0, item);
    state.visitedViews = views;
  },
  ADD_CACHED_VIEW: function(state, name) {
    if (name && state.cachedViews.indexOf(name) === -1) {
      state.cachedViews.push(name);
    }
  },
  REMOVE_CACHED_VIEW: function(state, name) {
    var idx = state.cachedViews.indexOf(name);
    if (idx > -1) state.cachedViews.splice(idx, 1);
  },
  CLEAR_CACHED_VIEWS: function(state) {
    state.cachedViews = [];
  },
  SET_ROUTER_VIEW_STATE: function(state, val) {
    state.routerViewState = val;
  }
};

var actions = {
  addTab: function(_ref, route) {
    var commit = _ref.commit;
    if (route.path === '/login') return;
    var name = route.matched.length > 0
      ? route.matched[route.matched.length - 1].name
      : route.name;
    var isSubApp = !!(route.meta && route.meta.isSubApp);
    var keepAlive = route.meta && route.meta.keepAlive !== false;
    var tab = {
      id: generateTabId(route),
      title: (route.meta && route.meta.title) || '未命名',
      path: route.path,
      fullPath: route.fullPath,
      name: name,
      params: route.params || {},
      query: route.query || {},
      closable: !(route.meta && route.meta.closable === false),
      keepAlive: keepAlive && !isSubApp,
      isSubApp: isSubApp
    };
    commit('ADD_VISITED_VIEW', tab);
    if (tab.keepAlive && tab.name) {
      commit('ADD_CACHED_VIEW', tab.name);
    }
  },

  closeTab: function(_ref2, view) {
    var commit = _ref2.commit;
    commit('REMOVE_VISITED_VIEW', view);
    if (view.name) commit('REMOVE_CACHED_VIEW', view.name);
  },

  closeOtherTabs: function(_ref3, view) {
    var commit = _ref3.commit, state = _ref3.state;
    var pinned = state.visitedViews.filter(function(v) {
      return v.closable === false && v.path !== view.path;
    });
    commit('SET_VISITED_VIEWS', [view].concat(pinned));
    rebuildCache(commit, state.visitedViews);
  },

  closeAllTabs: function(_ref4) {
    var commit = _ref4.commit, state = _ref4.state;
    var pinned = state.visitedViews.filter(function(v) { return v.closable === false; });
    commit('SET_VISITED_VIEWS', pinned);
    commit('CLEAR_CACHED_VIEWS');
    pinned.forEach(function(v) {
      if (v.keepAlive && v.name) commit('ADD_CACHED_VIEW', v.name);
    });
  },

  closeLeftTabs: function(_ref5, view) {
    var commit = _ref5.commit, state = _ref5.state;
    var index = -1;
    state.visitedViews.forEach(function(v, i) {
      if (v.path === view.path) index = i;
    });
    if (index <= 0) return;
    var kept = state.visitedViews.filter(function(v, i) {
      return i >= index || v.closable === false;
    });
    commit('SET_VISITED_VIEWS', kept);
    rebuildCache(commit, kept);
  },

  closeRightTabs: function(_ref6, view) {
    var commit = _ref6.commit, state = _ref6.state;
    var index = -1;
    state.visitedViews.forEach(function(v, i) {
      if (v.path === view.path) index = i;
    });
    if (index < 0) return;
    var kept = state.visitedViews.filter(function(v, i) {
      return i <= index || v.closable === false;
    });
    commit('SET_VISITED_VIEWS', kept);
    rebuildCache(commit, kept);
  },

  reorderTabs: function(_ref7, payload) {
    var commit = _ref7.commit;
    commit('REORDER_VISITED_VIEWS', payload);
  },

  refreshTab: function(_ref8, view) {
    var commit = _ref8.commit;
    var name = view.name;
    if (name) {
      commit('REMOVE_CACHED_VIEW', name);
    }
    return Vue.nextTick().then(function() {
      commit('SET_ROUTER_VIEW_STATE', true);
      return Vue.nextTick().then(function() {
        if (name) {
          commit('ADD_CACHED_VIEW', name);
        }
      });
    });
  },

  resetTabs: function(_ref9) {
    var commit = _ref9.commit;
    commit('SET_VISITED_VIEWS', []);
    commit('CLEAR_CACHED_VIEWS');
    commit('SET_ROUTER_VIEW_STATE', true);
    try { localStorage.removeItem(TABS_STORAGE_KEY); } catch (e) {}
  },

  persistTabs: function(_ref10) {
    var state = _ref10.state;
    try {
      var data = {
        visitedViews: serializeViews(state.visitedViews)
      };
      localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
  },

  restoreTabs: function(_ref11) {
    var commit = _ref11.commit;
    try {
      var raw = localStorage.getItem(TABS_STORAGE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (data && data.visitedViews && data.visitedViews.length > 0) {
        data.visitedViews.forEach(function(v) {
          commit('ADD_VISITED_VIEW', v);
          if (v.keepAlive && v.name) {
            commit('ADD_CACHED_VIEW', v.name);
          }
        });
        return data.visitedViews;
      }
    } catch (e) {}
    return null;
  },

  saveRedirect: function(_ref12, url) {
    try {
      if (url && url !== '/login') {
        localStorage.setItem(REDIRECT_STORAGE_KEY, url);
      }
    } catch (e) {}
  },

  getRedirect: function() {
    try {
      var url = localStorage.getItem(REDIRECT_STORAGE_KEY);
      localStorage.removeItem(REDIRECT_STORAGE_KEY);
      return url || null;
    } catch (e) {
      return null;
    }
  },

  clearRedirect: function() {
    try { localStorage.removeItem(REDIRECT_STORAGE_KEY); } catch (e) {}
  }
};

export { TABS_STORAGE_KEY, REDIRECT_STORAGE_KEY };

export default {
  state: state,
  mutations: mutations,
  actions: actions
};
