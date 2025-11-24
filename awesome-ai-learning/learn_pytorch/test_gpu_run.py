import torch

# 检查是否能使用 GPU
print(torch.cuda.is_available())

# 查看 GPU 设备数量
print(torch.cuda.device_count())

# 获取 GPU 名称
if torch.cuda.is_available():
    print(torch.cuda.get_device_name(0))
