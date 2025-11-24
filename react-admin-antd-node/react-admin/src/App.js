import React, {Suspense} from 'react';
import { BrowserRouter as Router , Route ,Routes} from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import routers from "@routers";
import 'antd/dist/reset.css';
function App ()  {

    const generateRoutes = (routes) => {
        return routes.map((route, index) => {
            const { path, component: Component, children } = route;
            return (
                <Route key={index} path={path} element={<Component />}>
                    {children && generateRoutes(children)}
                </Route>
            );
        });
    };
    return (
            <ConfigProvider locale={zhCN}>
                <DndProvider backend={HTML5Backend}>
                    <Router>
                        <Suspense fallback={<div>Loading...</div>}>
                            <Routes>
                                {generateRoutes(routers)}
                            </Routes>
                        </Suspense>
                    </Router>
                </DndProvider>
            </ConfigProvider>
    );
}

export default App;
