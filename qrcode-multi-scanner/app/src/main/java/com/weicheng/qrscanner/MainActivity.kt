package com.weicheng.qrscanner

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.weicheng.qrscanner.ui.Routes
import com.weicheng.qrscanner.ui.ScanViewModel
import com.weicheng.qrscanner.ui.home.HomeScreen
import com.weicheng.qrscanner.ui.multi.ItemDetailScreen
import com.weicheng.qrscanner.ui.multi.MultiResultScreen
import com.weicheng.qrscanner.ui.multi.MultiSessionScreen
import com.weicheng.qrscanner.ui.scan.ScanScreen
import com.weicheng.qrscanner.ui.single.SingleResultScreen
import com.weicheng.qrscanner.ui.theme.QrScannerTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            QrScannerTheme {
                QrScannerApp()
            }
        }
    }
}

/**
 * 页面地图与状态流转。
 *
 * 几个刻意的设计：
 * - `scan/single` 与 `scan/multi` 是**两个独立路由**，每次进入都是一个全新的
 *   Composable 实例，因而每次都会新建 [com.weicheng.qrscanner.scan.SingleShotGate]
 *   与相机分析器。这就是「一张只扫一次、必须手动点下一张」在架构上的保证，
 *   而不是靠某个 flag 去猜。
 * - 单张结果页用 `popUpTo(HOME)`，使返回栈始终是「首页 → 结果」两层，返回即回首页。
 * - 多张扫描成功后 `popBackStack()` 回到列表页，由用户决定何时点「扫描下一张」。
 */
@Composable
private fun QrScannerApp() {
    val navController = rememberNavController()
    val viewModel: ScanViewModel = viewModel()

    NavHost(navController = navController, startDestination = Routes.HOME) {

        // ---------- 首页 ----------
        composable(Routes.HOME) {
            HomeScreen(
                onSingleScan = { navController.navigate(Routes.SINGLE_SCAN) },
                onMultiScan = {
                    // 需求：进入「多张合并」即创建一个新的扫描任务。
                    viewModel.startNewSession()
                    navController.navigate(Routes.MULTI_SESSION)
                },
            )
        }

        // ---------- 单张扫描 ----------
        composable(Routes.SINGLE_SCAN) {
            ScanScreen(
                title = "单张扫描",
                scannedCount = null,
                onBack = { navController.popBackStack() },
                onScanned = { content ->
                    viewModel.setSingleResult(content)
                    navController.navigate(Routes.SINGLE_RESULT) {
                        popUpTo(Routes.HOME)
                    }
                },
            )
        }

        composable(Routes.SINGLE_RESULT) {
            val content by viewModel.singleResult.collectAsStateWithLifecycle()
            SingleResultScreen(
                content = content.orEmpty(),
                onRescan = {
                    navController.navigate(Routes.SINGLE_SCAN) {
                        popUpTo(Routes.HOME)
                    }
                },
                onBackHome = { navController.popBackStack(Routes.HOME, inclusive = false) },
                onBack = { navController.popBackStack() },
            )
        }

        // ---------- 多张合并 ----------
        composable(Routes.MULTI_SESSION) {
            val session by viewModel.session.collectAsStateWithLifecycle()
            val lastAppendedIndex by viewModel.lastAppendedIndex.collectAsStateWithLifecycle()

            MultiSessionScreen(
                session = session,
                lastAppendedIndex = lastAppendedIndex,
                onScanNext = {
                    viewModel.consumeAppendedNotice()
                    navController.navigate(Routes.MULTI_SCAN)
                },
                onOpenItem = { item -> navController.navigate(Routes.multiItem(item.id)) },
                onFinish = {
                    viewModel.consumeAppendedNotice()
                    navController.navigate(Routes.MULTI_RESULT)
                },
                onBack = { navController.popBackStack() },
            )
        }

        composable(Routes.MULTI_SCAN) {
            val session by viewModel.session.collectAsStateWithLifecycle()
            ScanScreen(
                title = "多张扫描",
                scannedCount = session.count,
                onBack = { navController.popBackStack() },
                onScanned = { content ->
                    viewModel.appendScan(content)
                    // 扫到一张就退回列表：不自动进入下一张，等用户自己决定。
                    navController.popBackStack()
                },
            )
        }

        composable(Routes.MULTI_ITEM) { backStackEntry ->
            val session by viewModel.session.collectAsStateWithLifecycle()
            val itemId = backStackEntry.arguments?.getString(Routes.ARG_ITEM_ID)
            val item = itemId?.let { session.find(it) }

            if (item == null) {
                // 条目已被删除（或进程重建后丢失），退回列表页。
                // 必须放在 LaunchedEffect 里：popBackStack 会修改导航状态，
                // 直接在组合期间调用属于在 composition 中做副作用。
                LaunchedEffect(Unit) { navController.popBackStack() }
            } else {
                ItemDetailScreen(
                    item = item,
                    onDelete = {
                        viewModel.deleteItem(item.id)
                        navController.popBackStack()
                    },
                    onBack = { navController.popBackStack() },
                )
            }
        }

        composable(Routes.MULTI_RESULT) {
            val session by viewModel.session.collectAsStateWithLifecycle()
            MultiResultScreen(
                session = session,
                joinStrategy = viewModel.joinStrategy,
                onRestart = {
                    viewModel.startNewSession()
                    navController.navigate(Routes.HOME) {
                        popUpTo(Routes.HOME) { inclusive = true }
                    }
                },
                onBack = { navController.popBackStack() },
            )
        }
    }
}
