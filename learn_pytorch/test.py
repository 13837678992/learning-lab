import os

import torch
from PIL import Image
from torch import nn
from torch.nn import Conv2d, MaxPool2d, Flatten, Linear
from torchvision import transforms

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(device)
img_dir = "./imgs/"


img_tensor = transforms.Compose([transforms.Resize((32, 32)), transforms.ToTensor()])
# 类别映射表
class_names = ["airplane", "automobile", "bird", "cat", "deer",
               "dog", "frog", "horse", "ship", "truck"]





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


model = torch.load('model.pth', weights_only=False)
model = model.to(device)
model.eval()

for img_name in os.listdir(img_dir):
    img_path = os.path.join(img_dir, img_name)
    true_label_prefix = img_name[:3]
    img = Image.open(img_path).convert('RGB')
    img_ten = img_tensor(img)
    img_ten = img_ten.unsqueeze(0)
    img_ten = img_ten.to(device)
    with torch.no_grad():
        output = model(img_ten)
        # print(output)
        # print(output.argmax(1))
        index = output.argmax(1).item()
        predicted_class = class_names[index]
        print(f"图片: {img_name} | 真实类别: {true_label_prefix} | 预测类别: {predicted_class}")



