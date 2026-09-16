<template>
  <div class="personal-detail-report">
    <h2>紫配覆盖率报表</h2>
    <SharedTable :data="list" />
  </div>
</template>

<script>
import SharedTable from '@/components/SharedTable.vue'

export default {
  name: 'PersonalDetailReport',
  components: { SharedTable },
  data() {
    return { list: [] }
  }
}
</script>
