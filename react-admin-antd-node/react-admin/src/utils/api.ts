import {post} from "@utils/request";
// 用户登录
    export const login = (params:Object) => {
        return  post('/api/signIn', params)
    }
