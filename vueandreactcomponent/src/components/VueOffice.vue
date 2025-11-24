<template>
  <vue-office-excel
      :src="excel"
      style="height: 100vh;"
      :options="options"
      @rendered="renderedHandler"
      @error="errorHandler"
  />
</template>

<script>
//引入VueOfficeExcel组件
import VueOfficeExcel from '@vue-office/excel'
//引入相关样式
import '@vue-office/excel/lib/index.css'

export default {
  components: {
    VueOfficeExcel
  },
  data() {
    return {
      options:{
        xls: true,       //预览xlsx文件设为false；预览xls文件设为true
        // minColLength: 0,  // excel最少渲染多少列，如果想实现xlsx文件内容有几列，就渲染几列，可以将此值设置为0.
        // minRowLength: 0,  // excel最少渲染多少行，如果想实现根据xlsx实际函数渲染，可以将此值设置为0.
        // widthOffset: 10,  //如果渲染出来的结果感觉单元格宽度不够，可以在默认渲染的列表宽度上再加 Npx宽
        // heightOffset: 10, //在默认渲染的列表高度上再加 Npx高
        beforeTransformData: (workbookData) => {return workbookData}, //底层通过exceljs获取excel文件内容，通过该钩子函数，可以对获取的excel文件内容进行修改，比如某个单元格的数据显示不正确，可以在此自行修改每个单元格的value值。
        transformData: (workbookData) => {return workbookData}, //将获取到的excel数据进行处理之后且渲染到页面之前，可通过transformData对即将渲染的数据及样式进行修改，此时每个单元格的text值就是即将渲染到页面上的内容
      },
      // excel: 'http://static.shanhuxueyuan.com/demo/excel.xlsx'//设置文档地址
      excel:"api/333.xls"
      // excel: null,
      // http://169.254.83.107:3000/22.xlsx

    }
  },
  // created() {
  //   // 假设这是你的文件URL
  //   const fileUrl = 'api/333.xls';
  //
  //   fetch(fileUrl)
  //       .then(response => {
  //         if (response.ok) {
  //           return response.arrayBuffer();
  //         }
  //         throw new Error('Network response was not ok.');
  //       })
  //       .then(arrayBuffer => {
  //         console.log(arrayBuffer)
  //         this.excel = arrayBuffer;
  //         // 使用 arrayBuffer 进行后续操作
  //
  //         // const data = new Uint8Array(arrayBuffer);
  //         // const workbook = XLSX.read(data, {type: 'array'});
  //
  //         // 输出或处理 workbook 对象
  //         // console.log(workbook);
  //       })
  //       .catch(error => {
  //         console.error('Failed to fetch file:', error);
  //       });
  //
  // }
  // ,
  methods: {
    renderedHandler() {
      console.log("渲染完成")
    },
    errorHandler() {
      console.log("渲染失败")
    }
  }
}
</script>