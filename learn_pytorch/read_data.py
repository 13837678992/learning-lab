from torch.utils.data import Dataset
from PIL import Image
import os
import cv2
import numpy as np

class MyData(Dataset):
    def __init__(self, root_dir, label_dir):
        self.root_dir = root_dir
        self.label_dir = label_dir
        self.path = os.path.join(self.root_dir, self.label_dir)
        self.img_path = os.listdir(self.path)

    def __getitem__(self, idx):
        img_name = self.img_path[idx]
        img_item_name = os.path.join(self.path, img_name)
        img = Image.open(img_item_name)
        return img, self.label_dir

    def __len__(self):
        return len(self.img_path)


root_dir = "dataSet/train"
ants_label_dir = "ants"
bees_label_dir = "bees"

ants_Data = MyData(root_dir, bees_label_dir)
print(ants_Data.__len__())
img,label = ants_Data[0]
# os.startfile(img)
# img.show(title="Image")  # 试试加 title，部分情况下有用
img_cv = np.array(img)  # 将 PIL.Image 转换为 OpenCV 格式
cv2.imshow('Image', img_cv)
cv2.waitKey(0)
cv2.destroyAllWindows()
