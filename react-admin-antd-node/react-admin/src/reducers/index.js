import { combineReducers } from 'redux';
import authReducer from './authReducer'; // 导入身份验证Reducer
import { persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
const rootReducer = combineReducers({
    auth: authReducer, // 添加身份验证Reducer到根Reducer中，可以根据需要添加其他Reducer
});
const persistConfig = {
    key: 'root', // 存储的键名
    storage, // 存储引擎
    // 可选的配置项：
    // whitelist: ['reducer1', 'reducer2'], // 白名单，只持久化指定的reducer
    // blacklist: ['reducer3', 'reducer4'] // 黑名单，不持久化指定的reducer
};
export const persistedReducer = persistReducer(persistConfig, rootReducer);
export default rootReducer
