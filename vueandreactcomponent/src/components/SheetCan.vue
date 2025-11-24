<template>
    <div>
      <button @click="fetchExcel">加载Excel文件</button>
      <canvas id="excelGrid"></canvas>
    </div>
  </template>
  
  <script>
  import axios from 'axios';
  import * as XLSX from 'xlsx';
  import CanvasDatagrid from 'canvas-datagrid';
  
  export default {
    methods: {
      fetchExcel() {
        axios({
          url: '你的API地址', // 请替换为实际的API地址
          method: 'GET',
          responseType: 'blob', // 重要：确保以Blob形式接收数据
        }).then(response => {
          const blob = response.data;
          const reader = new FileReader();
          reader.onload = (e) => {
            const data = e.target.result;
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
            this.renderGrid(jsonData);
          };
          reader.readAsArrayBuffer(blob);
        }).catch(error => {
          console.error('Error fetching Excel file:', error);
        });
      },
      renderGrid(data) {
        const grid = CanvasDatagrid({
          parentNode: document.getElementById('excelGrid')
        });
        grid.data = data;
      }
    }
  };
  </script>
  