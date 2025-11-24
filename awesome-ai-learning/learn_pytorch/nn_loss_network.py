import torch
import torchvision
from torch.nn import Sequential, Conv2d, MaxPool2d, Flatten, Linear, CrossEntropyLoss
from torch.utils.data import DataLoader

dataSet = torchvision.datasets.CIFAR10(root='./data', train=False, transform=torchvision.transforms.ToTensor(),
                                       download=True)
dataloader = DataLoader(dataset=dataSet, batch_size=64, shuffle=True, num_workers=0, drop_last=False)


class MyModule(torch.nn.module):
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

loss = CrossEntropyLoss()
model = MyModule()
optimizer = torch.optim.SGD(model.parameters(), lr=0.01)
for data in dataloader:
    imgs, targets = data
    outputs = model(imgs)
    result_loss = loss(outputs, targets)



