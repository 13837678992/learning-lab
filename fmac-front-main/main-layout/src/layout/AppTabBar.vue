<template>
  <div class="tab-bar">
    <div class="tab-list">
      <div
        v-for="(tab, index) in visitedViews"
        :key="tab.path"
        class="tab-item"
        :class="{ active: isActive(tab), dragging: dragState.dragging && dragState.fromIndex === index }"
        draggable="true"
        @click="navigateTo(tab)"
        @dblclick="dblClickClose(tab)"
        @contextmenu.prevent="openContextMenu($event, tab)"
        @dragstart="onDragStart($event, index)"
        @dragover.prevent="onDragOver($event, index)"
        @dragleave="onDragLeave"
        @drop.prevent="onDrop($event, index)"
        @dragend="onDragEnd"
      >
        <span class="tab-title">{{ tab.title }}</span>
        <span
          v-if="tab.closable"
          class="tab-close"
          @click.stop="closeTab(tab)"
        >&times;</span>
      </div>
    </div>
    <div v-if="contextMenu.visible" class="context-menu" :style="contextMenuStyle">
      <div class="context-item" @click="refreshCurrentTab">刷新</div>
      <div class="context-item" @click="closeCurrentTab">关闭</div>
      <div class="context-item" @click="closeOtherTabs">关闭其他</div>
      <div class="context-item" @click="closeLeftTabsAction">关闭左侧</div>
      <div class="context-item" @click="closeRightTabsAction">关闭右侧</div>
      <div class="context-item" @click="closeAllTabs">关闭全部</div>
    </div>
    <div
      v-if="contextMenu.visible"
      class="context-mask"
      @click="closeContextMenu"
      @contextmenu.prevent="closeContextMenu"
    ></div>
  </div>
</template>

<script>
import { mapState } from 'vuex';

export default {
  name: 'AppTabBar',
  data: function() {
    return {
      contextMenu: {
        visible: false,
        tab: null
      },
      contextMenuStyle: {},
      dragState: {
        dragging: false,
        fromIndex: -1,
        overIndex: -1
      }
    };
  },
  computed: mapState(['visitedViews']),
  watch: {
    '$route': function() {
      this.scrollToActiveTab();
    }
  },
  methods: {
    isActive: function(tab) {
      return this.$route.path === tab.path;
    },
    navigateTo: function(tab) {
      if (this.$route.path !== tab.path) {
        this.$router.push({
          path: tab.path,
          query: tab.query,
          params: tab.params
        });
      }
    },
    dblClickClose: function(tab) {
      if (tab.closable) {
        this.closeTab(tab);
      }
    },
    closeTab: function(tab) {
      var self = this;
      this.$store.dispatch('closeTab', tab).then(function() {
        if (self.isActive(tab) || self.visitedViews.length === 0) {
          self.navigateToLastTab();
        }
        self.$store.dispatch('persistTabs');
      });
    },
    navigateToLastTab: function() {
      var views = this.visitedViews;
      if (views.length > 0) {
        var last = views[views.length - 1];
        this.$router.push({ path: last.path, query: last.query, params: last.params });
      } else {
        this.$router.push('/home');
      }
    },
    openContextMenu: function(e, tab) {
      this.contextMenu.tab = tab;
      this.contextMenu.visible = true;
      this.contextMenuStyle = {
        left: e.clientX + 'px',
        top: e.clientY + 'px'
      };
    },
    closeContextMenu: function() {
      this.contextMenu.visible = false;
      this.contextMenu.tab = null;
    },
    refreshCurrentTab: function() {
      var tab = this.contextMenu.tab;
      this.closeContextMenu();
      if (tab) {
        this.$store.dispatch('refreshTab', tab);
      }
    },
    closeCurrentTab: function() {
      var tab = this.contextMenu.tab;
      this.closeContextMenu();
      if (tab) this.closeTab(tab);
    },
    closeOtherTabs: function() {
      var self = this;
      var tab = this.contextMenu.tab;
      this.closeContextMenu();
      if (tab) {
        this.$store.dispatch('closeOtherTabs', tab).then(function() {
          if (self.$route.path !== tab.path) {
            self.$router.push({ path: tab.path, query: tab.query, params: tab.params });
          }
          self.$store.dispatch('persistTabs');
        });
      }
    },
    closeLeftTabsAction: function() {
      var self = this;
      var tab = this.contextMenu.tab;
      this.closeContextMenu();
      if (tab) {
        this.$store.dispatch('closeLeftTabs', tab).then(function() {
          var views = self.visitedViews;
          var stillExists = views.some(function(v) { return v.path === self.$route.path; });
          if (!stillExists) {
            self.$router.push({ path: tab.path, query: tab.query, params: tab.params });
          }
          self.$store.dispatch('persistTabs');
        });
      }
    },
    closeRightTabsAction: function() {
      var self = this;
      var tab = this.contextMenu.tab;
      this.closeContextMenu();
      if (tab) {
        this.$store.dispatch('closeRightTabs', tab).then(function() {
          var views = self.visitedViews;
          var stillExists = views.some(function(v) { return v.path === self.$route.path; });
          if (!stillExists) {
            self.$router.push({ path: tab.path, query: tab.query, params: tab.params });
          }
          self.$store.dispatch('persistTabs');
        });
      }
    },
    closeAllTabs: function() {
      var self = this;
      this.closeContextMenu();
      this.$store.dispatch('closeAllTabs').then(function() {
        self.$router.push('/home');
        self.$store.dispatch('persistTabs');
      });
    },
    onDragStart: function(e, index) {
      this.dragState.dragging = true;
      this.dragState.fromIndex = index;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
    },
    onDragOver: function(e, index) {
      if (!this.dragState.dragging) return;
      e.dataTransfer.dropEffect = 'move';
      this.dragState.overIndex = index;
    },
    onDragLeave: function() {
      this.dragState.overIndex = -1;
    },
    onDrop: function(e, toIndex) {
      if (!this.dragState.dragging) return;
      var fromIndex = this.dragState.fromIndex;
      if (fromIndex !== toIndex && fromIndex >= 0) {
        this.$store.dispatch('reorderTabs', { from: fromIndex, to: toIndex }).then(function() {
          this.$store.dispatch('persistTabs');
        }.bind(this));
      }
      this.onDragEnd();
    },
    onDragEnd: function() {
      this.dragState.dragging = false;
      this.dragState.fromIndex = -1;
      this.dragState.overIndex = -1;
    },
    scrollToActiveTab: function() {
      this.$nextTick(function() {
        var active = this.$el.querySelector('.tab-item.active');
        if (active) {
          active.scrollIntoView({ behavior: 'smooth', inline: 'center' });
        }
      });
    }
  }
};
</script>

<style scoped>
.tab-bar {
  position: relative;
  background: #fff;
  border-bottom: 1px solid #d8dce5;
  padding: 4px 8px 0;
  display: flex;
  align-items: flex-end;
  height: 36px;
  box-shadow: 0 1px 3px 0 rgba(0,0,0,.06);
}

.tab-list {
  display: flex;
  overflow-x: auto;
  flex: 1;
  scrollbar-width: none;
}

.tab-list::-webkit-scrollbar {
  display: none;
}

.tab-item {
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  height: 28px;
  margin-right: 4px;
  border: 1px solid #d8dce5;
  border-radius: 3px 3px 0 0;
  font-size: 12px;
  color: #495060;
  background: #fff;
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
  transition: all .2s;
  flex-shrink: 0;
}

.tab-item:hover {
  color: #409eff;
}

.tab-item.active {
  background: #409eff;
  color: #fff;
  border-color: #409eff;
}

.tab-item.dragging {
  opacity: 0.5;
}

.tab-title {
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-close {
  margin-left: 6px;
  width: 14px;
  height: 14px;
  line-height: 12px;
  text-align: center;
  border-radius: 50%;
  font-size: 12px;
  transition: all .2s;
}

.tab-close:hover {
  background: rgba(0,0,0,.15);
  color: #fff;
}

.tab-item.active .tab-close:hover {
  background: rgba(255,255,255,.3);
}

.context-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2000;
}

.context-menu {
  position: fixed;
  z-index: 2001;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,.15);
  padding: 4px 0;
  min-width: 100px;
}

.context-item {
  padding: 6px 16px;
  font-size: 12px;
  color: #333;
  cursor: pointer;
  white-space: nowrap;
}

.context-item:hover {
  background: #ecf5ff;
  color: #409eff;
}
</style>
