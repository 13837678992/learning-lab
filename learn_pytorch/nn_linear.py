import torch
import torchvision
from torch.utils.data import DataLoader
from torch.utils.tensorboard import SummaryWriter

dataSet = torchvision.datasets.CIFAR10(root='./data', train=False, transform=torchvision.transforms.ToTensor())

dataloader = DataLoader(dataSet, batch_size=64, drop_last=True, shuffle=True)

writer = SummaryWriter("log")


class MyModule(torch.nn.Module):
    def __init__(self):
        super(MyModule, self).__init__()
        self.linear1 = torch.nn.Linear(196610, 10)

    def forward(self, x):
        output = self.linear1(x)
        return output


step = 0
my_model = MyModule()
for data in dataloader:
    imgs, targets = data
    # print(imgs.shape)
    writer.add_images("input", imgs, step)
    # output = torch.reshape(imgs, (1, 1, 1, -1))
    output = my_model(output)
    writer.add_images("output", output, step)
    # print(output.shape)
    step = step + 1

writer.close()
