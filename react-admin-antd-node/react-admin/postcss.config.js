module.exports = {
    plugins: [
        [
            'postcss-short',
            {
                prefix: ({ node }) => {
                    // 获取当前 CSS 规则的父节点选择器
                    const parentSelectors = node.parent.selectors;
                    if (parentSelectors && parentSelectors.length > 0) {
                        // 获取最后一个父节点选择器，可以根据实际情况进行调整
                        const parentSelector = parentSelectors[parentSelectors.length - 1];
                        // 使用父节点选择器作为前缀
                        return parentSelector.replace(/[.#]/g, '');
                    }
                    // 默认情况下不添加前缀
                    return '';
                },
            },

        ],
        [
            'postcss-preset-env',
        ]
    ],
};
