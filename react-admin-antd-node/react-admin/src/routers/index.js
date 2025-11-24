import React ,{lazy}from "react";
import {
    UserOutlined,
    DesktopOutlined,

} from '@ant-design/icons';
import home from "@routers/home";
const routeChildren = [ ...home]
const routes = [
    // 示例
    {
        title: '首页',
        path: '/',
        component: lazy( () => import( `@view/Layout` ) ),
        icon: <DesktopOutlined />,
        children: routeChildren

        // powerDot: POWERDOT.liveVisit,
    },
    {
        title: '登录',
        path: '/login',
        component: lazy( () => import( '@view/Login' ) ),
        icon: <UserOutlined />,
        // powerDot: POWERDOT.liveVisit,
    },
    {
        path: '*',
        component: lazy( () => import( `@view/NotFound` ) ),
        // powerDot: POWERDOT.liveVisit,

    },
];


function validateRoute(route) {
    // 检查 route 是否是一个对象
    if (typeof route !== 'object') {
        throw new Error('Route should be an object');
    }
    // 检查 route 是否有 path 和 component 属性
    if (!Object.prototype.hasOwnProperty.call(route, 'path') || !Object.prototype.hasOwnProperty.call(route, 'component')) {
        throw new Error('Route should have both path and component');
    }


    // 检查 path 是否是一个字符串
    if (typeof route.path !== 'string') {
        throw new Error('Route path should be a string');
    }

    // 如果 route 有 children，那么递归检查每一个 child
    if (route.children) {
        if (!Array.isArray(route.children)) {
            throw new Error('Route children should be an array');
        }
        route.children.forEach(validateRoute);
    }
}

// 使用
routes.forEach(validateRoute);

// 使用
routeChildren.forEach(validateRoute);


export {routeChildren}
export default  routes
