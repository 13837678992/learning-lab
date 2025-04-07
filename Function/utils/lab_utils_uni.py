import numpy as np
from ipywidgets import interact, FloatSlider
# from matplotlib import pyplot as plt
import matplotlib
matplotlib.use('Qt5Agg')  # 或者 'TkAgg'
import matplotlib.pyplot as plt
from utils.lab_utils_common import compute_cost
from utils.lab_utils_common import dlblue, dlorange, dldarkred, dlmagenta, dlpurple, dlcolors

# plt.ioff()
# 启用交互模式
plt.ion()



def mk_cost_lines(x, y, w, b, ax):
    ''' makes vertical cost lines'''
    cstr = "cost = (1/m)*("
    ctot = 0
    label = 'cost for point'
    addedbreak = False
    for p in zip(x, y):
        f_wb_p = w * p[0] + b
        c_p = ((f_wb_p - p[1]) ** 2) / 2
        c_p_txt = c_p
        ax.vlines(p[0], p[1], f_wb_p, lw=3, color=dlpurple, ls='dotted', label=label)
        label = ''  # just one
        cxy = [p[0], p[1] + (f_wb_p - p[1]) / 2]
        ax.annotate(f'{c_p_txt:0.0f}', xy=cxy, xycoords='data', color=dlpurple,
                    xytext=(5, 0), textcoords='offset points')
        cstr += f"{c_p_txt:0.0f} +"
        if len(cstr) > 38 and addedbreak is False:
            cstr += "\n"
            addedbreak = True
        ctot += c_p
    ctot = ctot / (len(x))
    cstr = cstr[:-1] + f") = {ctot:0.0f}"
    ax.text(0.15, 0.02, cstr, transform=ax.transAxes, color=dlpurple)

def plt_house_x(X, y,f_wb=None, ax=None):
    ''' plot house with aXis '''
    if not ax:
        fig, ax = plt.subplots(1,1)
    ax.scatter(X, y, marker='x', c='r', label="Actual Value")

    ax.set_title("Housing Prices")
    ax.set_ylabel('Price (in 1000s of dollars)')
    ax.set_xlabel(f'Size (1000 sqft)')
    if f_wb is not None:
        ax.plot(X, f_wb,  c=dlblue, label="Our Prediction")
    ax.legend()


# def plt_intuition(x_train, y_train):
#     w_range = np.array([200 - 200, 200 + 200])
#     tmp_b = 100
#
#     w_array = np.arange(*w_range, 5)
#     cost = np.zeros_like(w_range)
#     for i in range(len(w_range)):
#         tem_w = w_range[i]
#         cost[i] = compute_cost(x_train, y_train, tem_w, tmp_b)
#
#     def f(w=150):
#         f_wb = np.dot(x_train, w) + tmp_b
#
#         fig, ax = plt.subplots(1, 2, constrained_layout=True, figsize=(8, 4))
#         fig.canvas.toolbar_position = 'bottom'
#
#         mk_cost_lines(x_train, y_train, w, tmp_b, ax[0])
#         plt_house_x(x_train, y_train, f_wb=f_wb, ax=ax[0])
#
#         ax[1].plot(w_array, cost)
#         cur_cost = compute_cost(x_train, y_train, w, tmp_b)
#         ax[1].scatter(w, cur_cost, s=100, color=dldarkred, zorder=10, label=f"cost at w={w}")
#         ax[1].hlines(cur_cost, ax[1].get_xlim()[0], w, lw=4, color=dlpurple, ls='dotted')
#         ax[1].vlines(w, ax[1].get_ylim()[0], cur_cost, lw=4, color=dlpurple, ls='dotted')
#         ax[1].set_title("Cost vs. w, (b fixed at 100)")
#         ax[1].set_ylabel('Cost')
#         ax[1].set_xlabel('w')
#         ax[1].legend(loc='upper center')
#         fig.suptitle(f"Minimize Cost: Current Cost = {cur_cost:0.0f}", fontsize=12)
#         plt.draw()
#         plt.show()
#
#     interact(f, i=FloatSlider(value=10, min=w_array[0], max=w_array[-1], step=1, continuous_update=False))
def plt_intuition(x_train, y_train):

    w_range = np.array([200-200,200+200])
    tmp_b = 100

    w_array = np.arange(*w_range, 5)
    cost = np.zeros_like(w_array)
    for i in range(len(w_array)):
        tmp_w = w_array[i]
        cost[i] = compute_cost(x_train, y_train, tmp_w, tmp_b)

    @interact(w=(*w_range,10),continuous_update=False)
    def func( w=150):
        f_wb = np.dot(x_train, w) + tmp_b

        fig, ax = plt.subplots(1, 2, constrained_layout=True, figsize=(8,4))
        fig.canvas.toolbar_position = 'bottom'

        mk_cost_lines(x_train, y_train, w, tmp_b, ax[0])
        plt_house_x(x_train, y_train, f_wb=f_wb, ax=ax[0])

        ax[1].plot(w_array, cost)
        cur_cost = compute_cost(x_train, y_train, w, tmp_b)
        ax[1].scatter(w,cur_cost, s=100, color=dldarkred, zorder= 10, label= f"cost at w={w}")
        ax[1].hlines(cur_cost, ax[1].get_xlim()[0],w, lw=4, color=dlpurple, ls='dotted')
        ax[1].vlines(w, ax[1].get_ylim()[0],cur_cost, lw=4, color=dlpurple, ls='dotted')
        ax[1].set_title("Cost vs. w, (b fixed at 100)")
        ax[1].set_ylabel('Cost')
        ax[1].set_xlabel('w')
        ax[1].legend(loc='upper center')
        fig.suptitle(f"Minimize Cost: Current Cost = {cur_cost:0.0f}", fontsize=12)
        plt.show()
