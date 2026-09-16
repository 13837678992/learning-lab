const personalDetailReport = {
  path: 'frontwms/report-manager',
  meta: {
    title: '紫配覆盖率报表',
    component: () => import('@/views/reportmanager/PersonalDetailReport/index.vue')
  }
}

const stockReport = {
  path: 'frontwms/stock-report',
  meta: {
    title: '库存报表',
    component: () => import('@/views/reportmanager/StockReport/index.vue')
  }
}

const tabContainer = {
  path: 'frontwms/tab-container',
  meta: {
    title: '报表中心',
    component: () => import('@/views/reportmanager/TabContainer/index.vue')
  }
}

export default [personalDetailReport, stockReport, tabContainer]
