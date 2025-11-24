import torch
import torch.nn
import torchvision
from torch.utils.tensorboard import SummaryWriter

dataSet = torchvision.datasets.CIFAR10(root='./data', train=False, transform=torchvision.transforms.ToTensor(),
                                       download=True)
dataloader = torch.utils.data.DataLoader(dataset=dataSet, batch_size=64, shuffle=True, num_workers=0, drop_last=False)


class MyModule(torch.nn.Module):
    def __init__(self):
        super(MyModule, self).__init__()
        self.conv1 = torch.nn.Conv2d(3, 6, 3, stride=1, padding=0)

    def forward(self, x):
        x = self.conv1(x)
        x = torch.reshape(x, (-1, 3, 30, 30))
        return x


conv = MyModule()
summaryWriter = SummaryWriter("log")
step = 0
for data in dataloader:
    imgs, targets = data
    # print(imgs)
    # print(targets)
    # break
    # print(output.shape)
    output = conv(imgs)

    summaryWriter.add_images("input", imgs, step)
    summaryWriter.add_images("output", output, step)
    step = step + 1

summaryWriter.close()
