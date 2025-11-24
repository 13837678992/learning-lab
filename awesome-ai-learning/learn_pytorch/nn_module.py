import torch
from torch import nn

class MyModule(nn.Module):
    def __init__(self):
       super().__init__()

    def forward(self,x):
        output = x + 1
        return output

x = torch.tensor(1.0)
model = MyModule()
output = model(x)
print(output)



