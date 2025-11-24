import time

import torch
import torchvision
from torch import nn
from torch.nn import Conv2d, MaxPool2d, Flatten, Linear
from torch.utils.tensorboard import SummaryWriter

num_gpus = torch.cuda.device_count()
print(f"可用 GPU 数量: {num_gpus}")
start_time = time.time()

train_data = torchvision.datasets.CIFAR10(root="./data", train=True, transform=torchvision.transforms.ToTensor(),
                                          download=True)
test_data = torchvision.datasets.CIFAR10(root="./data", train=False, transform=torchvision.transforms.ToTensor(),
                                         download=True)

print("训练数据集的大小{}".format(len(train_data)))
print("测试数据集的大小{}".format(len(test_data)))

train_loader = torch.utils.data.DataLoader(dataset=train_data, batch_size=64, shuffle=True, num_workers=0)
test_loader = torch.utils.data.DataLoader(dataset=test_data, batch_size=64, shuffle=True, num_workers=0)


class MyModule(nn.Module):
    def __init__(self):
        super(MyModule, self).__init__()
        self.model = nn.Sequential(
            Conv2d(3, 32, 5, padding=2),
            MaxPool2d((2, 2)),
            Conv2d(32, 32, 5, padding=2),
            MaxPool2d((2, 2)),
            Conv2d(32, 64, 5, padding=2),
            MaxPool2d((2, 2)),
            Flatten(),
            Linear(1024, 64),
            Linear(64, 10)
        )

    def forward(self, x):
        x = self.model(x)
        return x


device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
model = MyModule().to(device)
#   定义损失函数和优化器
loss_fn = nn.CrossEntropyLoss().to(device)
learning_rate = 0.001
optim = torch.optim.Adam(model.parameters(), lr=learning_rate)
# optim = torch.optim.SGD(model.parameters(), lr=learning_rate)


total_train_step = 0
epoch = 30

writer = SummaryWriter("log")

for i in range(epoch):
    print("------第{}轮训练开始------".format(i + 1))
    # 训练数据集的遍历
    for data in train_loader:
        imgs, targets = data
        imgs, targets = imgs.to(device), targets.to(device)  # 确保数据也在 GPU 上
        outputs = model(imgs)
        loss = loss_fn(outputs, targets)
        optim.zero_grad()
        loss.backward()
        optim.step()
        total_train_step = total_train_step + 1
        if total_train_step % 100 == 0:
            print("训练次数: {}, Loss: {}".format(total_train_step, loss.item()))
            writer.add_scalar("train_loss", loss.item(), total_train_step)
    # 测试数据集的遍历
    model.eval()
    total_test_step = 0
    total_accuracy = 0

    with torch.no_grad():
        total_test_loss = 0
        for data in test_loader:
            imgs, targets = data
            imgs, targets = imgs.to(device), targets.to(device)  # 确保数据也在 GPU 上
            outputs = model(imgs)
            loss = loss_fn(outputs, targets)
            total_test_loss = total_test_loss + loss.item()
            acc = (outputs.argmax(1) == targets).sum()
            total_accuracy = total_accuracy + acc

            # optim.zero_grad()
            # loss.backward()
            # optim.step()
            # total_test_step = total_test_step + 1
            # if total_test_step % 100 == 0:
            #     print("测试次数: {}, Loss: {}".format(total_test_step, loss.item()))
    print("整体测试集上的Loss: {}".format(total_test_loss))
    writer.add_scalar("test_loss", total_test_loss, total_test_step)
    total_test_step = total_test_step + 1

    end_time = time.time()
    torch.save(model, "model.pth")
    print("训练消耗的时间为{}".format(end_time - start_time))  # SGD 60.7235426902771  Adam  46.16196799278259
