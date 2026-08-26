<template>
  <div class="layout">
    <app-header />
    <div class="layout-body">
      <app-sidebar />
      <div class="layout-content">
        <app-tab-bar />
        <div class="content-wrapper">
          <keep-alive v-if="!isSubAppRoute" :include="cachedViews">
            <router-view :key="viewKey" />
          </keep-alive>
          <div
            v-show="isSubAppRoute"
            id="subapp-container"
            class="subapp-container"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import AppHeader from './AppHeader.vue';
import AppSidebar from './AppSidebar.vue';
import AppTabBar from './AppTabBar.vue';

export default {
  name: 'Layout',
  components: {
    AppHeader,
    AppSidebar,
    AppTabBar
  },
  data: function() {
    return {
      viewKey: 0
    };
  },
  computed: {
    cachedViews: function() {
      return this.$store.state.cachedViews;
    },
    isSubAppRoute: function() {
      var route = this.$route;
      if (route.meta && route.meta.isSubApp) return true;
      var menu = this.$store.state.menu;
      if (menu && menu.length > 0) {
        return menu.some(function(item) {
          return route.path === item.route || route.path.indexOf(item.route + '/') === 0;
        });
      }
      return false;
    }
  },
  watch: {
    '$store.state.routerViewState': function(val) {
      if (val) {
        this.viewKey++;
      }
    }
  }
};
</script>

<style scoped>
.layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.layout-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.layout-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f0f2f5;
}

.content-wrapper {
  flex: 1;
  overflow-y: auto;
  position: relative;
}

.subapp-container {
  width: 100%;
  min-height: 100%;
}
</style>
