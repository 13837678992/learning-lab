import torchvision
from torch.utils.tensorboard import SummaryWriter
import os

script_dir = os.path.dirname(os.path.abspath(__file__))  # 获取当前脚本所在目录

log_dir = os.path.join(script_dir, "log")  # 确保 log 在脚本同级目

print(log_dir)  # 查看当前工作目录

dataset_transform = torchvision.transforms.Compose([
    torchvision.transforms.ToTensor(),
])
touch_dataSet = torchvision.datasets.CIFAR10(root='./data', train=True,transform=dataset_transform, download=False)
touch_testSet = torchvision.datasets.CIFAR10(root='./data', train=False, transform=dataset_transform,download=False)

img,target = touch_testSet[0]

print(img)
print(img.shape)
writer = SummaryWriter(log_dir)

for i in range(10):
    img,target = touch_testSet[i]
    writer.add_image("test",img,i)

writer.close()






print(len(touch_dataSet))
print(len(touch_testSet))

print(img)
print(touch_testSet.classes)
print(touch_testSet.classes[target])
