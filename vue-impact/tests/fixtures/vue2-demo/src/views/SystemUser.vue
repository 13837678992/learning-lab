<template>
  <div class="system-user-page">
    <h1>系统用户</h1>
    <UserTable />
  </div>
</template>

<script>
import UserTable from '@/components/UserTable.vue'

export default {
  name: 'SystemUserPage',
  components: { UserTable }
}
</script>
