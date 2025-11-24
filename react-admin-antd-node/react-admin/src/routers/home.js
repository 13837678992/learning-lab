import React, {lazy} from "react";
import {PieChartOutlined} from "@ant-design/icons";

export  default [
    {
        title: '产品',
        path:'/products',
        component: lazy( () => import( `@view/Products` ) ),
        icon: <PieChartOutlined />,
    },
    {
        title: '产品1',
        path:'/Live2D',
        component: lazy( () => import( `@view/Products/Live2D` ) ),
        icon: <PieChartOutlined />,
    },
    {
        title: '超长列表',
        path:'/langList',
        component: lazy( () => import( `@view/Products/LangList` ) ),
        icon: <PieChartOutlined />,
    },
    {
        title: '虚拟列表',
        path:'/virtualList',
        component: lazy( () => import( `@view/Products/VirtualList` ) ),
        icon: <PieChartOutlined />,
    }
]
