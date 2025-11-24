from torch.utils.tensorboard import SummaryWriter
import numpy as np
from PIL import Image

writer = SummaryWriter("logs")
img_path = "learn_pytorch/dataSet/train/ants/0013035.jpg"
img_pil = Image.open(img_path)
# print(img_pil.shape)
img_ndarray = np.array(img_pil)
print(img_ndarray.shape)
#
# writer.add_image("test", img_ndarray, 2,dataformats='HWC')
#
# for i in range(1, 100):
#     writer.add_scalar("y=2x", 2 * i, i)
# writer.close()
