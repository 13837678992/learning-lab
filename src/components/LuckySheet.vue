<template>
  <div>
    <input type="file" @change="handleFileChange"/>
    <div id="luckysheet12" :style="luckyCss"></div>
  </div>
</template>

<script>
import LuckyExcel from "luckyexcel";
// eslint-disable-next-line
import luckysheet from "luckysheet";

export default {
  name: 'LuckySheet',
  data() {
    return {
      luckysheet: null,  // 定义luckysheet为局部变量
      luckyCss: {
        margin: '0px',
        padding: '0px',
        position: 'absolute',
        width: '100%',
        height: '100%',
        left: '0px',
        top: '100px'
      }
    };
  },
  mounted() {
    this.luckysheet = window.luckysheet;
    console.log(this.luckysheet,'luckysheet')
    this.luckysheet.create({
      container: "luckysheet12",
      title: 'Luckysheet sphinx Demo', // 设置表格名称
      data: [],
      plugins: ['chart'],
      showinfobar: false
    });
    this.fetchData();
  },
  methods: {
    fetchData() {
      // 实现具体的数据获取逻辑
    },
    handleFileChange(event) {
      const files = event.target.files;
      if (files.length === 0) return;  // 如果没有文件，直接返回

      LuckyExcel.transformExcelToLucky(files[0], (exportJson) => {
        if (exportJson.sheets == null || exportJson.sheets.length === 0) {
          alert("无法读取Excel文件内容，目前不支持xls文件！");
          return;
        }
        this.luckysheet.destroy();
        this.luckysheet.create({
          container: 'luckysheet12',
          showinfobar: false,
          data: exportJson.sheets,
          title: exportJson.info.name,
          userInfo: exportJson.info.name.creator
        });
      });
    }
  }
}
</script>

<style scoped>
/* CSS 样式可以保持与原始组件一致或根据需要进行修改 */
</style>
