import '@babel/polyfill';
import 'url-polyfill';
import React from 'react';
import ReactDOM from 'react-dom/client';
import {Provider, useSelector} from 'react-redux';
import App from './App';
import reportWebVitals from './reportWebVitals';
import store, {persistor} from './store';
const root = ReactDOM.createRoot(document.getElementById('root'));
import { PersistGate } from 'redux-persist/integration/react';

root.render(
    <React.StrictMode>
        <Provider store={store}>
            <PersistGate loading={null} persistor={persistor}>
                <App />
            </PersistGate>
        </Provider>
    </React.StrictMode>
);
reportWebVitals();
