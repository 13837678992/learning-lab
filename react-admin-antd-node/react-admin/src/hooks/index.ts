import  { useEffect ,useState} from 'react';

import {  Result, get } from '@utils/request';

// import { useLocation } from 'react-router-dom';
export function useScript(url: string) {
    // const location = useLocation();
    useEffect(() => {
        const script = document.createElement('script');
        script.src = url;
        script.async = true;
        document.body.appendChild(script);

        return () => {
            console.log('unmount', url);
            const scriptParent = script.parentNode;
            if (scriptParent) {
                scriptParent.removeChild(script);
            }
        };
    }, [url]);
}



export function useSequentialDataFetch<T>(urls: string[]): { data: Result[]; loading: boolean; error: Error | null } {
    const [data, setData] = useState<Result[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        (async function fetchData() {
            setLoading(true);
            for (const url of urls) {
                let retryCount = 0;

                while (retryCount < 3) {
                    try {
                        const result = await get(url);
                        if (!result.success) {
                            throw new Error(result.message || 'Unknown error');
                        }
                        setData(prevData => [...prevData, result]);
                        break;
                    } catch (err) {
                        if (retryCount === 2) {
                            setError(err as Error);
                            console.error('Failed to fetch:', url);
                        } else {
                            retryCount++;
                        }
                    }
                }
            }
            setLoading(false);
        })();
    }, [urls]);

    return { data, loading, error };
}




