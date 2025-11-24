import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from plotly.graph_objects import Figure

# 模拟训练数据
x_train = np.array([100, 200, 300, 400, 500])
y_train = np.array([300, 500, 700, 900, 1100])

# 固定偏置 b
b = 100


# 计算损失函数
def compute_cost(x, y, w, b):
    m = x.shape[0]
    cost = ((w * x + b - y) ** 2).sum() / (2 * m)
    return cost


# 构建滑块的所有步骤（每个 w 值对应一帧）
w_values = np.arange(0, 400, 10)
frames = []
for w in w_values:
    f_wb = w * x_train + b
    cost = compute_cost(x_train, y_train, w, b)

    # 每帧包含两个图：预测图 和 Cost 曲线图上的点
    frame = go.Frame(
        data=[
            go.Scatter(x=x_train, y=y_train, mode='markers', name='真实数据'),
            go.Scatter(x=x_train, y=f_wb, mode='lines', name=f'预测线 w={w}'),
            go.Scatter(x=[w], y=[cost], mode='markers', name='当前 Cost 点', marker=dict(size=10, color='red'))
        ],
        name=str(w)
    )
    frames.append(frame)

# 初始显示的预测线和 cost 点
init_w = w_values[0]
init_fwb = init_w * x_train + b
init_cost = compute_cost(x_train, y_train, init_w, b)

# 构建图表
fig = make_subplots(rows=1, cols=2, subplot_titles=("预测图", "Cost vs w"))
fig.add_trace(go.Scatter(x=x_train, y=y_train, mode='markers', name='真实数据'), row=1, col=1)
fig.add_trace(go.Scatter(x=x_train, y=init_fwb, mode='lines', name=f'预测线 w={init_w}'), row=1, col=1)

# Cost 曲线图
cost_values = [compute_cost(x_train, y_train, w, b) for w in w_values]
fig.add_trace(go.Scatter(x=w_values, y=cost_values, mode='lines', name='Cost 曲线'), row=1, col=2)
fig.add_trace(
    go.Scatter(x=[init_w], y=[init_cost], mode='markers', name='当前 Cost 点', marker=dict(size=10, color='red')),
    row=1, col=2)

# 设置滑块
sliders = [dict(
    steps=[dict(method='animate',
                args=[[str(w)], dict(mode='immediate', frame=dict(duration=0), transition=dict(duration=0))],
                label=f"{w}") for w in w_values],
    transition=dict(duration=0),
    x=0.1,
    xanchor="left",
    y=0,
    yanchor="top"
)]

# 添加设置
fig = Figure(
    data=[
        go.Scatter(x=x_train, y=y_train, mode='markers', name='真实数据'),
        go.Scatter(x=x_train, y=init_fwb, mode='lines', name=f'预测线 w={init_w}'),
        go.Scatter(x=w_values, y=cost_values, mode='lines', name='Cost 曲线'),
        go.Scatter(x=[init_w], y=[init_cost], mode='markers', name='当前 Cost 点', marker=dict(size=10, color='red')),
    ],
    layout=dict(
        title="线性回归：预测与 Cost 动态关系（Plotly）",
        sliders=sliders,
        width=1000,
        height=500
    ),
    frames=frames  # ✅ 正确添加位置
)

fig.show()
