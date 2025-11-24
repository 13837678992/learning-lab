import torch
import torchvision
from torchvision.models import VGG16_Weights

# dataSet = torchvision.datasets.ImageNet(root='./data_images_net', split='train', transform=torchvision.transforms.ToTensor(),download=True)

vgg16_false = torchvision.models.vgg16(weights=None)
vgg16_true = torchvision.models.vgg16(weights=VGG16_Weights.IMAGENET1K_V1)
print(vgg16_false)
print(vgg16_true)

dataSet = torchvision.datasets.CIFAR10(root='./data', train=False, transform=torchvision.transforms.ToTensor(),download=True)

vgg16_true.add_module('add_linear', torch.nn.Linear(1000, 10))
print(vgg16_true)
vgg16_true.classifier.add_module('add_linear', torch.nn.Linear(1000, 10))
print(vgg16_true)

vgg16_false.classifier[6] = torch.nn.Linear(4096, 10)
print(vgg16_false)