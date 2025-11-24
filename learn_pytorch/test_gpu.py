import torch

import time

# 获取 GPU 数量
num_gpus = torch.cuda.device_count()
print(f"可用 GPU 数量: {num_gpus}")

# 遍历所有 GPU，查看设备信息
for i in range(num_gpus):
    print(f"GPU {i}: {torch.cuda.get_device_name(i)}")

# 检查当前默认 GPU
print(f"当前默认 GPU: {torch.cuda.current_device()}")
print(torch.version.cuda)

# 获取 GPU 数量
num_gpus = torch.cuda.device_count()
print(f"可用 GPU 数量: {num_gpus}")

# 遍历所有 GPU，查看设备信息
for i in range(num_gpus):
    print(f"GPU {i}: {torch.cuda.get_device_name(i)}")

# 检查当前默认 GPU
print(f"当前默认 GPU: {torch.cuda.current_device()}")

# 设置设备为 GPU
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# 创建一个大的随机张量来消耗 GPU 计算资源
tensor_size = 2048  # 调整张量大小来增加计算负载
x = torch.randn(tensor_size, tensor_size, device=device)
y = torch.randn(tensor_size, tensor_size, device=device)

# 执行一个大量矩阵运算
start_time = time.time()
while True:
    result = torch.mm(x, y)  # 持续进行矩阵乘法运算
    # 每10次计算打印一次时间消耗
    if time.time() - start_time > 10:
        print(f"Time taken for 10 matrix multiplications: {time.time() - start_time} seconds")
        start_time = time.time()