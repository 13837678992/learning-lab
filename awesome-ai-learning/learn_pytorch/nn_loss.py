import torch
from torch.nn import L1Loss

input = torch.tensor([1, 2, 0],dtype=torch.float32)
target = torch.tensor([2, 2, 5],dtype=torch.float32)

# input = torch.reshape(input, (1, 1, 1, 3))
# target = torch.reshape(target, (1, 1, 1, 3))

loss = L1Loss(reduction='sum')
output = loss(input, target)
print(output)


mseloss = torch.nn.MSELoss()
output2 = mseloss(input, target)
print(output2)1