import React from 'react';
import { Result, Button } from 'antd';

const NotFound = () => {
    const handleGoBack = () => {
        // 处理返回首页的逻辑
        // 你可以使用React Router或其他路由库进行导航

    };

    return (
        <Result
            status="404"
            title="404"
            subTitle="抱歉，您访问的页面不存在！"
            extra={
                <Button type="primary" onClick={handleGoBack}>
                    返回首页
                </Button>
            }
        />
    );
};

export default NotFound;
