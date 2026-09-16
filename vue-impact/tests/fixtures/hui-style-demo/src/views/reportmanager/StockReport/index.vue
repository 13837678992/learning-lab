<template>
  <div class="stock-report">
    <h2>库存报表</h2>
    <SharedTable :data="list" />
  </div>
</template>

<script>
import SharedTable from '@/components/SharedTable.vue'

export default {
  name: 'StockReport',
  components: { SharedTable },
  data() {
    return { list: [] }
  }
}
</script>
