import React, {useEffect, useState} from 'react';
import {Link, Outlet, useLocation, useNavigate} from 'react-router-dom';
import {useDispatch, useSelector} from "react-redux";
import {Layout, Menu, Dropdown, Avatar, Space} from 'antd';
import {
    UserOutlined,
    LogoutOutlined, DownOutlined, SmileOutlined,
} from '@ant-design/icons';
import {routeChildren} from '@routers';
import {logout} from '@actions/authActions';



const { Header, Content, Footer, Sider } = Layout;


function generateMenuItems(routes) {
    if (!routes) return null;
    return routes.map((route, index) => {
        return ({
            key: route.path,
            icon: route.icon,
            children: route.children ? generateMenuItems(route.children) : null,
            label: route.title,
        });
    });
}
const items = generateMenuItems(routeChildren);
function  LayoutIndex() {
    const [collapsed, setCollapsed] = useState(false);
    // 一个递归的函数，用于生成菜单项
    const dispatch = useDispatch();
    const menu = (
        [ {
            key: '1',
            label: (
                   <span> 个人信息</span>
            ),
            icon:<UserOutlined />
        },
            {
                key: '2',
                label: (
                    <span onClick={()=>{
                        console.log('退出登录')
                        dispatch(logout())

                    }}>退出登录</span>
                ),
                icon: <LogoutOutlined />,
            }]
    );
    const navigate = useNavigate();
    const location = useLocation();
    console.log(location,'location')
    const isAuthenticated = useSelector(state => state.auth.isAuthenticated);
    useEffect(() => {
        console.log(isAuthenticated,'isAuthenticated')
        if (!isAuthenticated) {
        navigate('/login',{state: { from: location.pathname }})
        }
    })
    const onClick = (e) => {
        console.log('click ', e);
        navigate(e.key);
    };
    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Header className="site-layout-background" style={{ padding: 0, display: 'flex', justifyContent: 'flex-end', paddingRight: 20 ,alignItems: 'center'}}>
                <Dropdown menu={ {items:menu} }  placement="bottomRight">
                    <Avatar icon={<UserOutlined />}/>
                </Dropdown>
            </Header>

            <Layout className="site-layout">
                <Sider collapsible  collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
                    {/*<div className="demo-logo-vertical" />*/}
                    <Menu onClick={onClick} theme="dark" defaultSelectedKeys={['1']} mode="inline" items={items} />
                </Sider>
                <Content style={{ margin: '0 16px' }}>
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    )
}

export default LayoutIndex
