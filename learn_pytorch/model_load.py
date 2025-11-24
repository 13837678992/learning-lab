# 模型加载#
import torch
import torchvision
from torchvision.models import vgg
from torch.serialization import safe_globals

with safe_globals([vgg.VGG]):  # 明确允许加载 VGG 类
    model_save = torch.load('vgg16_method1.pth', weights_only=False)
    # print(model_save)

with safe_globals([vgg.VGG]):  # 明确允许加载 VGG 类
    vgg16 = torchvision.models.vgg16(weights='IMAGENET1K_V1')
    state_dict = torch.load('vgg16_method2.pth', weights_only=False)
    vgg16.load_state_dict(state_dict)
    print(vgg16)  # 这样 vgg16 还是原来的模型
