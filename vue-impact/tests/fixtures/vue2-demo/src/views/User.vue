<template>
  <div class="user-page">
    <h1>用户</h1>
    <UserTable />
  </div>
</template>

<script>
import UserTable from '@/components/UserTable.vue'

export default {
  name: 'UserPage',
  components: { UserTable }
}
</script>
