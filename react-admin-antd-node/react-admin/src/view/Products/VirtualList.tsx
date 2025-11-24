import React, { useEffect, useState, useCallback } from 'react';
import { Checkbox } from 'antd';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';

interface DataType {
    key: number;
    name: string;
}

const totalItems = 10000;

const Row: React.FC<ListChildComponentProps & { selected: boolean; onToggle: (index: number) => void }> = ({ index, style, selected, onToggle }) => (
    <div style={style}>
        <Checkbox checked={selected} onChange={() => onToggle(index)}>
            {`Option ${index + 1}`}
        </Checkbox>
    </div>
);

const HugeList: React.FC = () => {
    const [data, setData] = useState<DataType[]>([]);
    const [selectedKeys, setSelectedKeys] = useState<number[]>([]);
    const isAllSelected = selectedKeys.length === data.length;

    useEffect(() => {
        setData(Array.from({ length: totalItems }, (_, i) => ({ key: i, name: `Option ${i + 1}`})));
    }, []);

    const handleToggle = useCallback((index: number) => {
        setSelectedKeys(keys => {
            if (keys.includes(index)) {
                return keys.filter(key => key !== index);
            } else {
                return [...keys, index];
            }
        });
    }, []);

    const handleToggleAll = useCallback(() => {
        setSelectedKeys(isAllSelected ? [] : data.map((_, index) => index));
    }, [isAllSelected, data]);

    return (
        <div>
            <Checkbox checked={isAllSelected} onChange={handleToggleAll}>
                Select All
            </Checkbox>
            <List
                height={600}
                itemCount={data.length}
                itemSize={35}
                width="100%"
            >
                {({ index, style }) => (
                    <Row index={index} style={style} selected={selectedKeys.includes(index)} onToggle={handleToggle}  data={data}/>
                )}
            </List>
        </div>
    );
};

export default HugeList;
