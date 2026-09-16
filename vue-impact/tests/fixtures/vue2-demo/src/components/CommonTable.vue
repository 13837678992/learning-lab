<template>
  <div class="common-table">
    <table>
      <tbody>
        <tr v-for="row in data" :key="row.id">
          <td v-for="col in columns" :key="col.prop">{{ row[col.prop] }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import { get } from '@/utils/request'

export default {
  name: 'CommonTable',
  props: {
    columns: { type: Array, default: () => [] },
    data: { type: Array, default: () => [] }
  },
  methods: {
    fetchData() {
      return get('/api/list')
    }
  }
}
</script>
