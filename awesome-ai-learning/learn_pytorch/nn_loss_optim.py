import torch
import torchvision
from torch.nn import Sequential, Conv2d, MaxPool2d, Flatten, Linear, CrossEntropyLoss
from torch.utils.data import DataLoader


# 获取 GPU 数量
num_gpus = torch.cuda.device_count()
print(f"可用 GPU 数量: {num_gpus}")

# 遍历所有 GPU，查看设备信息
for i in range(num_gpus):
    print(f"GPU {i}: {torch.cuda.get_device_name(i)}")

# 检查当前默认 GPU
print(f"当前默认 GPU: {torch.cuda.current_device()}")


dataSet = torchvision.datasets.CIFAR10(root='./data', train=False, transform=torchvision.transforms.ToTensor(),
                                       download=True)
dataloader = DataLoader(dataset=dataSet, batch_size=1, shuffle=True, num_workers=0, drop_last=False)

class MyModule(torch.nn.Module):
    def __init__(self):
        super().__init__()
        self.model1 = Sequential(
            Conv2d(3, 32, 5, padding=2),
            MaxPool2d(2
                      ),
            Conv2d(32, 32, 5, padding=2),
            MaxPool2d(2),
            Conv2d(32, 64, 5, padding=2),
            MaxPool2d(2),
            Flatten(),
            Linear(1024, 64),
            Linear(64, 10)

        )

    def forward(self, x):
        x = self.model1(x)
        return x

device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")

print(device)

# 一次性把 model、数据、损失函数、优化器都放到 GPU
model = MyModule().to(device)
loss = CrossEntropyLoss().to(device)
optimizer = torch.optim.SGD(model.parameters(), lr=0.01)



print(f"模型运行在: {next(model.parameters()).device}")
step = 0
for epoch in range(20):
    run_loss = 0.0
    for data in dataloader:
        imgs, targets = data
        imgs, targets = imgs.to(device), targets.to(device)  # 确保数据也在 GPU 上
        if step == 0:
            print(f"当前数据设备: {imgs.device}")
        step = step + 1
        # 打印当前数据设备
        # print(f"当前数据设备: {imgs.device}")
        outputs = model(imgs)  # 现在不会报错
        result_loss = loss(outputs, targets)
        optimizer.zero_grad()
        result_loss.backward()
        optimizer.step()
        run_loss += result_loss.item()

    print(run_loss)
    


