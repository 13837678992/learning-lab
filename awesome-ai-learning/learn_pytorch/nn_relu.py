import torch
import torchvision
from torch.utils.tensorboard import SummaryWriter

dataSet = torchvision.datasets.CIFAR10(root='./data', train=False, transform=torchvision.transforms.ToTensor(),
                                       download=True)
dataloader = torch.utils.data.DataLoader(dataset=dataSet, batch_size=64, shuffle=True, num_workers=0, drop_last=False)

class MyModule(torch.nn.Module):
    def __init__(self):
        super().__init__()
        self.relu1 = torch.nn.ReLU()
        self.sigmoid = torch.nn.Sigmoid()
    def forward(self, x):
        # x = self.relu1(x)
        x = self.sigmoid(x)
        return x

worker =  SummaryWriter("log")
model = MyModule()
step = 0
for data in dataloader:
    imgs, label = data
    worker.add_images("input", imgs, global_step=step)
    output = model(imgs)
    worker.add_images("output", output, global_step=step)

worker.close()