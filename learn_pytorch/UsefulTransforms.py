from PIL import Image
import os

from torch.utils.tensorboard import SummaryWriter
from torchvision import transforms

# 手动设置工作目录为项目根目录
# os.chdir('C:/Users/weicheng/study/awesome-ai-learning')
img = Image.open("learn_pytorch/dataSet/train/ants/0013035.jpg")
tensor_tran = transforms.ToTensor()
tensor_img = tensor_tran(img)

worker = SummaryWriter("logs")
worker.add_image("tensor",tensor_img)
#Normalize
print(tensor_img[0][0][0])
tran_nor = transforms.Normalize([0.5,0.5,0.5],[0.5,0.5,0.5])
nor_img = tran_nor(tensor_img)
print(nor_img[0][0][0])
worker.add_image("normalize",nor_img)
# Resize
tran_resize = transforms.Resize((512,512))
resize_img = tran_resize(img)
tran_re_img = tensor_tran(resize_img)
worker.add_image("resize",tran_re_img)

#Combine
tran_resize_2 = transforms.Resize((200))
tran_combine = transforms.Compose([tran_resize,tensor_tran])
combine_img = tran_combine(img)
worker.add_image("combine",combine_img)

worker.close()


# print(img)