<template>
  <div class="order-page">
    <h1>订单</h1>
    <OrderTable />
  </div>
</template>

<script>
import OrderTable from '@/components/OrderTable.vue'

export default {
  name: 'OrderPage',
  components: { OrderTable }
}
</script>
