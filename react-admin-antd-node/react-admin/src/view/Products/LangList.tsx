import React, { useEffect, useRef, useState } from 'react';
import { Table } from 'antd';

const HugeTable: React.FC = () => {
    const [data, setData] = useState<{ key: number, name: string }[]>([]);
    const isMounted = useRef(false);
    const frame = useRef(0);
    const frameId = useRef<number | null>(null);

    const totalItems = 10000;
    const itemsPerFrame = 100;

    useEffect(() => {
        isMounted.current = true;
        frame.current = 0;

        setData([]); // Reset data when the effect runs

        function loadItems() {
            const start = frame.current * itemsPerFrame;
            const end = start + itemsPerFrame;

            if (isMounted.current) {
                setData(prev => [
                    ...prev,
                    ...Array.from({ length: itemsPerFrame }, (_, i) => ({ key: start + i + 1, name: `Option ${start + i + 1}` }))
                ]);
            }

            if (end < totalItems) {
                frame.current++;
                frameId.current = requestAnimationFrame(loadItems);
            }
        }

        loadItems();

        return () => {
            console.log('卸载')
            isMounted.current = false;
            if (frameId.current) {
                cancelAnimationFrame(frameId.current);
            }
        };
    }, []); // Removed "data" from the dependency array

    const rowSelection = {
        onChange: (selectedRowKeys: React.Key[], selectedRows: any[]) => {
            console.log(`selectedRowKeys: ${selectedRowKeys}`, 'selectedRows: ', selectedRows);
        }
    };

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
        },
    ];

    return (
        <Table rowSelection={{ type: 'checkbox', ...rowSelection }} columns={columns} dataSource={data} pagination={false} />
    );
};

export default HugeTable;
