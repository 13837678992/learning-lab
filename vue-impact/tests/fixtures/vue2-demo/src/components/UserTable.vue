<template>
  <div class="user-table">
    <CommonTable :columns="columns" :data="list" />
  </div>
</template>

<script>
import CommonTable from '@/components/CommonTable.vue'

export default {
  name: 'UserTable',
  components: { CommonTable },
  data() {
    return { columns: [], list: [] }
  }
}
</script>
