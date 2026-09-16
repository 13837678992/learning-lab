<template>
  <div class="user-list-page">
    <h1>用户列表</h1>
    <UserTable />
  </div>
</template>

<script>
import UserTable from '@/components/UserTable.vue'

export default {
  name: 'UserListPage',
  components: { UserTable }
}
</script>
