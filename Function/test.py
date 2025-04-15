# demo1

# import matplotlib.pyplot as plt
#
# plt.plot([1, 2, 3], [4, 5, 6])
# plt.title("测试图像")
# plt.xlabel("X轴")
# plt.ylabel("Y轴")
# plt.grid(True)
# plt.show()


# demo2
# import numpy as np
# import timeit
# import matplotlib.pyplot as plt
#
#
# def dot_product_with_loop(a, b):
#     """使用Python原生循环计算点积"""
#     result = 0
#     for x, y in zip(a, b):
#         result += x * y
#     return result
#
#
# def compare_dot_methods(size):
#     """比较两种点积计算方法在不同数组大小下的性能"""
#     # 准备数据
#     a = np.random.rand(size)
#     b = np.random.rand(size)
#
#     # 测试np.dot
#     np_time = timeit.timeit(lambda: np.dot(a, b), number=100)
#
#     # 测试循环方法
#     loop_time = timeit.timeit(lambda: dot_product_with_loop(a, b), number=100)
#
#     return np_time, loop_time
#
#
# def run_comparison():
#     """运行比较并绘制结果"""
#     sizes = [10, 100, 1000, 5000, 10000, 50000, 100000, 1000000]
#     np_times = []
#     loop_times = []
#
#     for size in sizes:
#         np_time, loop_time = compare_dot_methods(size)
#         np_times.append(np_time)
#         loop_times.append(loop_time)
#         print(
#             f"Size: {size:6d} | np.dot: {np_time:.6f}s | Loop: {loop_time:.6f}s | Speedup: {loop_time / np_time:.1f}x")
#
#         # 绘制结果
#     plt.figure(figsize=(10, 6))
#     plt.plot(sizes, np_times, label='np.dot', marker='o')
#     plt.plot(sizes, loop_times, label='Python loop', marker='x')
#     plt.xscale('log')
#     plt.yscale('log')
#     plt.xlabel('Array Size')
#     plt.ylabel('Time for 100 operations (s)')
#     plt.title('Performance Comparison: np.dot vs Python Loop')
#     plt.legend()
#     plt.grid(True)
#     plt.show()
#
#
# if __name__ == "__main__":
#     run_comparison()


# demo3
x = 1
X = 2
print(x)
print(X)
