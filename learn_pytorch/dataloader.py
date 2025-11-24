import torch
import torchvision
from torch.utils.tensorboard import SummaryWriter

test_dataset = torchvision.datasets.CIFAR10(root='./data', train=False, transform=torchvision.transforms.ToTensor())
test_loader = torch.utils.data.DataLoader(dataset=test_dataset, batch_size=64, shuffle=True,num_workers=0,drop_last=False)

writer = SummaryWriter("log")
step = 0
for data in test_loader:
    img, label = data
    writer.add_images("dataloader", img, global_step=step)
    step = step + 1

writer.close()
