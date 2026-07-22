<template>
  <ul class="menu-tree">
    <li v-for="node in nodes" :key="node.id" class="menu-tree-item">
      <div
        :class="['menu-node', { leaf: isLeaf(node), active: isActive(node) }]"
        @click="onClick(node)"
      >
        {{ node.title }}
      </div>
      <MenuTree
        v-if="node.children && node.children.length"
        :nodes="node.children"
        @select="$emit('select', $event)"
      />
    </li>
  </ul>
</template>

<script>
/**
 * 递归菜单树（渲染 @fmac/core 的 parseMenu 输出）。
 * 叶子节点可点击，向上 emit('select', node) 由 AppSidebar 统一处理跳转 + tab。
 */
export default {
  name: 'MenuTree',
  props: {
    nodes: { type: Array, default: () => [] },
  },
  methods: {
    isLeaf(node) {
      return !node.children || node.children.length === 0;
    },
    isActive(node) {
      return this.$route && node.url && this.$route.path === node.url;
    },
    onClick(node) {
      if (this.isLeaf(node) && node.url) this.$emit('select', node);
    },
  },
};
</script>

<style scoped>
.menu-tree {
  list-style: none;
  margin: 0;
  padding: 0 0 0 10px;
}
.menu-node {
  padding: 6px 10px;
  font-size: 13px;
  color: #475569;
  cursor: default;
  border-radius: 4px;
}
.menu-node.leaf {
  cursor: pointer;
  color: #334155;
}
.menu-node.leaf:hover {
  background: #f1f5f9;
}
.menu-node.active {
  background: #eff6ff;
  color: #2563eb;
}
</style>
