import store from '@/store';

export function getApps() {
  var menu = store.state.menu;
  if (menu && menu.length > 0) {
    return menu
      .filter(function(item) { return item.entry; })
      .map(function(item) {
        return {
          name: item.app_code,
          entry: item.entry,
          container: '#subapp-container',
          activeRule: item.route
        };
      });
  }
  return [
    {
      name: 'app-demo',
      entry: process.env.VUE_APP_DEMO_ENTRY || '//localhost:9001',
      container: '#subapp-container',
      activeRule: '/app-demo'
    }
  ];
}
