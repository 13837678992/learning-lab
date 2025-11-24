import { createStore } from 'redux';
import rootReducer, {persistedReducer} from './reducers'; // 导入根Reducer
import { persistStore } from 'redux-persist';
const store = createStore(persistedReducer); // 创建Redux store
export default store;
export const persistor = persistStore(store);
