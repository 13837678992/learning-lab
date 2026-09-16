<template>
  <div class="shared-table">
    <table>
      <tbody>
        <tr v-for="row in data" :key="row.id">
          <td>{{ row.name }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
export default {
  name: 'SharedTable',
  props: {
    data: { type: Array, default: () => [] }
  }
}
</script>
