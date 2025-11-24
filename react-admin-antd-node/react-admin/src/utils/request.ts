import { message } from 'antd';
import fetch from 'isomorphic-fetch';
import store from "../store";

const isAuthenticated:Boolean = store.getState().auth.isAuthenticated;
export type IRequestMethod = 'GET' | 'PUT' | 'POST' | 'DELETE';
export interface ICheckStatusProps {
    response: Response;
    options?: any;
    url?: string;
}
interface ErrorWithResponse extends Error {
    response?: Response;
}

function checkRedirection(response: Response): boolean {
    const url = response.headers.get('location');
    if (!url) return false;
    try {
        const redirectUrl = new URL(url);
        if (redirectUrl.hostname !== window.location.hostname) {
            window.location.href = url;
            return true;
        }
    } catch (err) {
        console.log('redirect url error');
    }

    return false;
}

function getErrorWithResponse(response: Response): ErrorWithResponse {
    const error: ErrorWithResponse = new Error(response.statusText);
    error.response = response;
    error.message = JSON.stringify(response);

    return error;
}

function checkStatus({ response, options, url }: ICheckStatusProps): Response {
    if (checkRedirection(response)) {
        throw getErrorWithResponse(response);
    } else if (response.status >= 200 && response.status < 300) {
        return response;
    } else {
        // Sentry.withScope((scope) => {
        //     scope.setLevel('error' as Sentry.Severity);
        //     scope.setTag('actions', 'RequestError');
        //     scope.setTag('requestUrl', `${url}`);
        //     scope.setExtra('requestOptions', options);
        //     Sentry.captureMessage(`Fetch Error - ${response.status} - ${url}`);
        // });

        throw getErrorWithResponse(response);
    }
}

/**
 * 给 URL 加上 _t=时间戳
 * @param {string} url 完整 url 或者 path
 */
function addTimestamp(url: string): string {
    const t = `_t=${Date.now()}`;
    const sep = url.includes('?') ? '&' : '?';
    return url + sep + t;
}


export type FetchResult = Promise<Result>;

/**
 * Requests a URL, returning a promise.
 *
 * @param  {string} _url       The URL we want to request
 * @param  {object} [options] The options we want to pass to "fetch"
 * @return {Promise<{ data: any, err: Error }>}           An object containing either "data" or "err"
 */
export default function request(_url: string, options?: any): FetchResult  {
    const token = localStorage.getItem('token');
    options.headers['Authorization'] = `Bearer ${token}`;
    const url = addTimestamp(_url );
    if (options.method === 'POST' || options.method === 'PUT' || options.method === 'GET') {
        if (!(options.body instanceof FormData)) {
            options.headers = {
                Accept: 'application/json',
                'Content-Type': 'application/json; charset=utf-8',
                ...options.headers,
            };
            options.body = JSON.stringify(options.body);
        } else {
            // NewOptions.body is FormData
            options.headers = {
                Accept: 'application/json',
                ...options.headers,
            };
        }
    }
    if (!options.headers) options.headers = {};
    return fetch(url, options)
        .then(response => checkStatus({
            response,
            options: options,
            url: _url,
        }))
        .then(response => response.json())
        .then((data:any) :Result  => {
            const { code } = data;
            if (code === 'SYSTEM_ERROR') {
                message.error('系统异常');
            }
            return ({
                ...data,
                success: true,
            });
        })
        .catch((err: any):Result => {
            if (err && err.response) {
                return err.response.json().then((data: any) => {
                    if (err.response.status === 401 || err.response.status === 403) {
                        if (isAuthenticated && err.response.status === 401) {
                            message.destroy();
                            message.error(`${data.msg || '登录已过期'},您需要重新登录,稍后将跳转至首页`);
                            setTimeout(() => {
                                window.location.href = '/login';
                            }, 1000);
                            return {
                                ...err,
                                success: false,
                                message: data.msg || '登录已过期',
                            }
                        }
                        return {
                            ...err,
                            success: false,

                        }
                    } else if (err.response.status === 200) {
                        return {
                            ...err,
                            success: false,
                            message: data.msg || '解析错误',
                        };
                    } else {
                        return {
                            ...err,
                            success: false,
                            message: data.msg || '系统异常',
                        };
                    }
                }).catch((e: Error) => {
                    // console.log(e);
                    return {
                        ...err,
                        success: false,
                        message: '系统异常',
                    };
                });
            } else {
                return {
                    code: "", data: undefined,
                    success: false,
                    message: '系统异常'
                };
            }
        });
}



export function get(url: string, params: any = {}) {
    return request(url, {
        method: 'GET',
    });
}

export function post(url: string, params: any = {}, form = false) {
    let body;
    if (form) {
        const formData = new FormData();
        Object.keys(params).forEach(key => params[key] && formData.append(key, params[key]));
        body = formData;
    } else {
        body = params;
    }
    return request(url, {
        method: 'POST',
        body,
    });
}

export function put(url: string, params: any = {}) {
    return request(url, {
        method: 'PUT',
        body: params,
    });
}

export function del(url: string) {
    return request(url, {
        method: 'DELETE',
    });
}


export type Result =
    {
        success: boolean;
        code?: string;
        data?: any;
        response?: any; // 原始数据
        message?: string;
    };

/**
 * 自动解包多级 data （当 data 存在且仅存在 data 属性）
 * TODO 可以对 request 包一层，避免样板代码
 */
export function normalizeResult<T = any>(res: {
    err: Error | null;
    data: any;
}): Result {
    if (!res) {
        return {
            success: false,
            data: null,
            message: '',
            code: '',

        };
    }
    if (res.err) {
        return {
            success: false,
            code: '',
            message: res.err.message,
        };
    } else {
        // 第一层 data 是服务端返回的原始 response
        let { data } = res;

        if (!data) {
            return {
                success: false,
                code: '',
                message: '',
            };
        }

        /**
         * data 是数组的情况
         * （还没有发现什么接口什么情况下服务端会直接返回数组，虽然双春说有）
         */
        if (Array.isArray(data)) {
            return {
                success: true,
                data: data as any,
                response: res.data,
                code: res.data.code,
                message: res.data.msg,
            };
        }

        /**
         * 返回错误
         */
        if (data.success !== true) {
            return {
                success: false,
                message: data.msg,
                code: data.code,
                data,
            };
        }

        // 第二层 data 为 response 的 data 属性
        ({ data } = data);

        // 如果 data 下面有且只有一层 data，则进入下一层
        while (
            data &&
            Object.prototype.hasOwnProperty.call(data, 'data') &&
            Object.keys(data).length === 1
            ) {
            ({ data } = data);
        }

        return {
            success: true,
            data,
            response: res.data,
            code: res.data.code,
            message: res.data.msg,
        };
    }
}


