<template>
  <div>{{ name + "11" }}</div>
  <ElButton type="primary" @click="handleRequest">请求数据</ElButton>
  <div class="flex justify-center">{{ data }}</div>
</template>

<script lang="ts" setup>
import { useRoute } from "vue-router";
import { ElButton } from "element-plus";
import { ref, onUnmounted } from "vue";
// import UploadWorker from "./shared_worker.js";
const name = useRoute().query.name;
const data = ref("初始");
// TODO
// const worker = new UploadWorker();
// worker.port.onmessage = e => {
//   data.value = e.data;
// };
const handleRequest = () => {
  // port 发送信息
  // worker.port.postMessage("请求数据");
};
onUnmounted(() => {
  // worker.port.close();
});
</script>
