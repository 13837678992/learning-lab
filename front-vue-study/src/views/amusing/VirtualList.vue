<template>
  <div class="scroll-container-aaa">
    <div class="actual-height-container" />
    <div class="translate-container">
      <div
        v-for="item in actualRenderData"
        :key="item.id"
        class="list-item"
        :style="{ height: itemHeight + 'px' }"
      >
        {{ item.name }}
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import useVirtualList from "@/hooks/useVirtualList";

export default defineComponent({
  setup() {
    // 模拟数据源：1000条数据
    const data = ref(
      Array.from({ length: 100000 }, (_, i) => ({ id: i, name: `Item ${i}` }))
    );
    const itemHeight = 50; // 每个项目的高度
    const size = 10; // 每次渲染10个项目

    // 调用虚拟列表组合函数
    const { actualRenderData } = useVirtualList({
      data,
      itemHeight,
      size,
      scrollContainer: ".scroll-container-aaa",
      actualHeightContainer: ".actual-height-container",
      translateContainer: ".translate-container",
      itemContainer: ".list-item"
    });

    return {
      actualRenderData,
      itemHeight
    };
  }
});
</script>

<style scoped>
.scroll-container-aaa {
  position: relative;
  width: 300px;
  height: 500px;
  overflow-y: auto;
  border: 1px solid #ccc;
}

.actual-height-container {
  /* 不使用绝对定位，使其占据空间 */
  width: 100%;
}

.translate-container {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  pointer-events: none; /* 确保不拦截事件 */
}

.list-item {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid #ddd;
}
</style>
