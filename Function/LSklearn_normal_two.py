import numpy as np
import matplotlib.pyplot as plt
from sklearn.linear_model import LinearRegression
from utils.lab_utils_multi import load_house_data

plt.style.use('./deeplearning.mplstyle')
np.set_printoptions(precision=2)

# 加载数据
X_train, y_train = load_house_data()
X_features = ['size(sqft)', 'bedrooms', 'floors', 'age']

linear_model = LinearRegression()
linear_model.fit(X_train, y_train)

b = linear_model.intercept_
w = linear_model.coef_
print(f"w = {w:}, b = {b:0.2f}")

print(f"对训练集进行预测:\n {linear_model.predict(X_train)[:4]}")
print(f"预测使用 w,b:\n {(X_train @ w + b)[:4]}")
print(f"原始值 \n {y_train[:4]}")

x_house = np.array([1200, 3, 1, 40]).reshape(-1, 4)
x_house_predict = linear_model.predict(x_house)[0]
print(f" 1200 平方英尺、3 间卧室、1 层楼、40 年房龄的房子的预测价格 = ${x_house_predict * 1000:0.2f}")
