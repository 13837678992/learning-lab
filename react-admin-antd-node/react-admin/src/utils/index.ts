type isArrayLikeType = {
    length: number;
    [key: number]: any;
};
// 获取storage的大小
function getStorageSize(storage: Storage): number {
    let totalSize = 0;

    for (let i = 0; i < storage.length; i++) {
        const key: string | null = storage.key(i);
        if (key) {
            const value: string | null = storage.getItem(key);
            if (value) {
                totalSize += key.length + value.length;
            }
        }
    }

    return totalSize;
}

// 获取 localStorage 的大小
const localStorageSize:number = getStorageSize(localStorage);
// 获取 sessionStorage 的大小
const sessionStorageSize:number = getStorageSize(sessionStorage);
// 判断是否为类数组

// @ts-ignore
function isArrayLike(o:isArrayLikeType):boolean {
    return (o && typeof o === "object" && Number.isFinite(o.length) && o.length >= 0 && Number.isInteger(o.length) && o.length < 4294967295);

}
// 合并promises
async function mergePromises(promises: (() => Promise<any>)[]): Promise<any[]> {
    const results: any[] = [];
    for (const promiseFn of promises) {
        const result = await promiseFn();
        results.push(result);
    }
    return results;
}


export {default as request} from './request'
export {
    getStorageSize,
    localStorageSize,
    sessionStorageSize,
    mergePromises
}
