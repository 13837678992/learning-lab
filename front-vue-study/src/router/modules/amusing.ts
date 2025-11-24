const Layout = () => import("@/layout/index.vue");

export default {
  path: "/amusing",
  component: Layout,
  meta: {
    icon: "ri:information-line",
    // showLink: false,
    title: "有趣的页面",
    rank: 1
  },
  children: [
    {
      path: "/amusing/sharedWorker",
      name: "标签共享数据",
      component: () => import("@/views/amusing/sharedWorker.vue"),
      meta: {
        title: "标签共享数据"
      }
    },
    {
      path: "/amusing/sharedWorker2",
      name: "标签共享数据1",
      component: () => import("@/views/amusing/sharedWorker.vue"),
      meta: {
        title: "标签共享数据1"
      }
    },
    {
      path: "/amusing/sharedWorker3",
      name: "虚拟列表",
      component: () => import("@/views/amusing/VirtualList.vue"),
      meta: {
        title: "虚拟列表"
      }
    }
  ]
} satisfies RouteConfigsTable;
