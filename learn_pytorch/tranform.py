from PIL import Image
from torchvision import transforms
from torch.utils.tensorboard import SummaryWriter

img_path  = "dataSet/train/ants/0013035.jpg"
pil_img = Image.open(img_path)

tensor_tran = transforms.ToTensor()

tensor_img = tensor_tran(pil_img)

writer = SummaryWriter("logs")

writer.add_image("tensor",tensor_img)
writer.close()

