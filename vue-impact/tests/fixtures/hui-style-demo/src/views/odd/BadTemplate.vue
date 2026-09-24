<template>
  <div class="bad-template">
    <SharedTable :data="list" />
  <!-- 故意不闭合 div，触发模板 Invalid end tag -->
</template>

<script>
import SharedTable from '@/components/SharedTable.vue'

export default {
  name: 'BadTemplate',
  components: { SharedTable },
  data() {
    return { list: [] }
  }
}
</script>
