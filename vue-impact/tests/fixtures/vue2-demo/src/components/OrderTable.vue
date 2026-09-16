<template>
  <div class="order-table">
    <CommonTable :columns="columns" :data="list" />
  </div>
</template>

<script>
import CommonTable from '@/components/CommonTable.vue'

export default {
  name: 'OrderTable',
  components: { CommonTable },
  data() {
    return { columns: [], list: [] }
  }
}
</script>
