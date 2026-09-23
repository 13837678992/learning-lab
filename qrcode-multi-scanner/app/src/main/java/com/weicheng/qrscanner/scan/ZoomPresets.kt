package com.weicheng.qrscanner.scan

/**
 * 由设备的缩放能力推导出界面上的缩放档位。
 *
 * 高密度二维码扫不出来的一个直接原因是「每个 QR module 在画面里占的像素太少」。
 * 把二维码拍大有两种办法：人走近，或者调大相机的 zoom。前者受限于手臂长度和
 * 二维码本身的大小，后者是纯光学/传感器裁切（CameraX 的 zoom 走 `SCALER_CROP_REGION`，
 * 是真实的传感器裁切而非插值放大），确实能增加落在二维码上的有效像素。
 *
 * **绝不假设所有设备都支持 2×。** 档位全部由 `cameraInfo.zoomState` 报出的
 * 实际最小/最大倍数推导：设备最大只到 1.2× 就一个档位都不给（整行不显示），
 * 最大到 100× 也只给到 5×（再往上没有新的光学信息）。
 *
 * 纯函数、无 `android.*` 依赖，可以直接用 JVM 单元测试覆盖。
 */
object ZoomPresets {

    /** 候选档位。1× 由 [base] 承担，不放在候选里。 */
    private val CANDIDATES = listOf(2f, 3f, 5f)

    /** 低于这个倍数不值得单独给一个档位（`1.1×` 这种档位纯属噪音）。 */
    private const val MIN_STEP = 1.4f

    /**
     * 设备最大倍数超过 [MAX_TOP] 时不再把最大倍数做成档位。
     *
     * 到这一步已经是纯数码放大，没有新的光学信息，画面只会更抖更糊。
     */
    private const val MAX_TOP = 8f

    /**
     * 推导缩放档位。
     *
     * @return 升序排列的档位；**返回空列表表示这台设备不值得显示缩放控件**。
     */
    fun presets(minZoom: Float, maxZoom: Float): List<Float> {
        // NaN / Infinity 会让下面的比较全部为 false 或行为未定义，直接当作「不支持」。
        if (!minZoom.isFinite() || !maxZoom.isFinite()) return emptyList()

        // 提前返回还有一个作用：coerceIn 在 min > max 时会抛 IllegalArgumentException，
        // 这个判断同时把它挡掉了。
        if (maxZoom <= minZoom) return emptyList()

        // 1× 在普通机型上就是「不缩放」，在带超广角的机型上则是能被夹到设备最小倍数。
        // 刻意不把 0.5× 之类的超广角档位放出来：把画面缩小永远不能帮助看清二维码。
        val base = 1f.coerceIn(minZoom, maxZoom)
        val result = mutableListOf(base)

        for (candidate in CANDIDATES) {
            if (candidate >= base * MIN_STEP && candidate <= maxZoom) result += candidate
        }

        // 设备最大倍数本身往往是最有用的一档（在保证能扫到的前提下尽可能放大），
        // 但只在它没有远到荒谬时才给。
        val top = result.last()
        if (maxZoom > top && maxZoom >= base * MIN_STEP && maxZoom <= base * MAX_TOP) {
            result += maxZoom
        }

        val distinct = result.distinct().sorted()
        // 只有一个档位等于没有选择，控件不显示。
        return if (distinct.size < 2) emptyList() else distinct
    }
}
