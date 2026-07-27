import './public-path';
import Vue from 'vue';
import App from './App.vue';
import router from './router';
import { setActions, requestLogout } from './context';

Vue.config.productionTip = false;

var instance = null;

function render(props) {
  if (props) {
    setActions({
      onGlobalStateChange: props.onGlobalStateChange,
      setGlobalState: props.setGlobalState
    });
  }
  var options = {
    router: router,
    render: function(h) { return h(App); }
  };
  if (props && props.onGlobalStateChange) {
    options.created = function() {
      props.onGlobalStateChange(function(state) {
        this.$root.$emit('global-state-change', state);
      }.bind(this), true);
    };
  }
  instance = new Vue(options).$mount(
    props && props.container
      ? props.container.querySelector('#app')
      : '#app'
  );
}

if (!window.__POWERED_BY_QIANKUN__) {
  render();
}

window.microApp = {
  logout: requestLogout
};

export async function bootstrap() {
  console.log('[app-demo] bootstrap');
}

export async function mount(props) {
  console.log('[app-demo] mount');
  render(props);
}

export async function unmount() {
  console.log('[app-demo] unmount');
  if (instance && instance.$el && instance.$el.parentNode) {
    instance.$el.parentNode.removeChild(instance.$el);
  }
  instance.$destroy();
  instance = null;
}
