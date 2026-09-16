<template>
  <div class="tab-container">
    <el-tabs>
      <el-tab-pane label="二级标签入口">
        <SharedTable :data="list" />
        <router-view />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script>
import SharedTable from '@/components/SharedTable.vue'

export default {
  name: 'TabContainer',
  components: { SharedTable },
  data() {
    return { list: [] }
  }
}
</script>
