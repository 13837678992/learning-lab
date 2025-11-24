export const login = (username:string, password:string ) => {
    // 在这里执行登录操作，例如调用登录API
    return {
        type: 'LOGIN',
        payload: { username, password },
    };
};

export const logout = () => {
    // 在这里执行登出操作，例如调用登出API
    return {
        type: 'LOGOUT',
    };
};
