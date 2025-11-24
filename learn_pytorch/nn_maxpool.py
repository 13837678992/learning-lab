import torch
import torch.nn
import torchvision
from torch.nn import MaxPool2d
from torch.utils.data import DataLoader
from torch.utils.tensorboard import SummaryWriter

# input = torch.tensor([[1, 2, 0, 3, 1], [0, 1, 2, 3, 1], [1, 2, 1, 0, 0], [5, 2, 3, 1, 1], [2, 1, 0, 1, 1]])
#
# input  = torch.reshape(input,(-1,1,5,5))

dataSet = torchvision.datasets.CIFAR10(root='./data',train=False,transform=torchvision.transforms.ToTensor())
dataloader = DataLoader(dataset=dataSet,batch_size=64,shuffle=True,num_workers=0,drop_last=False)
class MyModule(torch.nn.Module):
    def __init__(self):
        super().__init__()
        self.maxpool1 = MaxPool2d(kernel_size=3,ceil_mode=False)

    def forward(self, x):
        x = self.maxpool1(x)
        return x

maxp = MyModule()
witer = SummaryWriter('log')
step = 0
for data in dataloader:
    imgs,targets = data
    output = maxp(imgs)
    # print(output.shape)
    witer.add_images("input",imgs,global_step=step)
    witer.add_images("output",output,global_step=step)

witer.close()
# output = maxp(input)
# print(output)