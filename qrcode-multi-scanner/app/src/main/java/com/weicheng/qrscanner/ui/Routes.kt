package com.weicheng.qrscanner.ui

/**
 * 页面路由。
 *
 * 用集中常量而不是散落的字符串，方便一眼看清整个应用的页面地图：
 *
 * ```
 * home
 *  ├── scan/single  ──> single/result
 *  └── multi/session
 *        ├── scan/multi        （每次「扫描下一张」都重新进入）
 *        ├── multi/item/{id}   （查看 / 删除单张）
 *        └── multi/result
 * ```
 */
object Routes {
    const val HOME = "home"

    const val SINGLE_SCAN = "scan/single"
    const val SINGLE_RESULT = "single/result"

    const val MULTI_SESSION = "multi/session"
    const val MULTI_SCAN = "scan/multi"
    const val MULTI_RESULT = "multi/result"

    const val ARG_ITEM_ID = "itemId"
    const val MULTI_ITEM = "multi/item/{$ARG_ITEM_ID}"

    fun multiItem(itemId: String): String = "multi/item/$itemId"
}
