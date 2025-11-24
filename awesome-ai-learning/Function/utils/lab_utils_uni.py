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
# plt.ion()


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


def plt_house_x(X, y, f_wb=None, ax=None):
    ''' plot house with aXis '''
    if not ax:
        fig, ax = plt.subplots(1, 1)
    ax.scatter(X, y, marker='x', c='r', label="Actual Value")

    ax.set_title("Housing Prices")
    ax.set_ylabel('Price (in 1000s of dollars)')
    ax.set_xlabel(f'Size (1000 sqft)')
    if f_wb is not None:
        ax.plot(X, f_wb, c=dlblue, label="Our Prediction")
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
    w_range = np.array([200 - 200, 200 + 200])
    tmp_b = 100

    w_array = np.arange(*w_range, 5)
    cost = np.zeros_like(w_array)
    for i in range(len(w_array)):
        tmp_w = w_array[i]
        cost[i] = compute_cost(x_train, y_train, tmp_w, tmp_b)

    @interact(w=(*w_range, 10), continuous_update=False)
    def func(w=150):
        f_wb = np.dot(x_train, w) + tmp_b

        fig, ax = plt.subplots(1, 2, constrained_layout=True, figsize=(8, 4))
        fig.canvas.toolbar_position = 'bottom'

        mk_cost_lines(x_train, y_train, w, tmp_b, ax[0])
        plt_house_x(x_train, y_train, f_wb=f_wb, ax=ax[0])

        ax[1].plot(w_array, cost)
        cur_cost = compute_cost(x_train, y_train, w, tmp_b)
        ax[1].scatter(w, cur_cost, s=100, color=dldarkred, zorder=10, label=f"cost at w={w}")
        ax[1].hlines(cur_cost, ax[1].get_xlim()[0], w, lw=4, color=dlpurple, ls='dotted')
        ax[1].vlines(w, ax[1].get_ylim()[0], cur_cost, lw=4, color=dlpurple, ls='dotted')
        ax[1].set_title("Cost vs. w, (b fixed at 100)")
        ax[1].set_ylabel('Cost')
        ax[1].set_xlabel('w')
        ax[1].legend(loc='upper center')
        fig.suptitle(f"Minimize Cost: Current Cost = {cur_cost:0.0f}", fontsize=12)
        plt.show()


def plt_contour_wgrad(x, y, hist, ax, w_range=[-100, 500, 5], b_range=[-500, 500, 5],
                      contours=[0.1, 50, 1000, 5000, 10000, 25000, 50000],
                      resolution=5, w_final=200, b_final=100, step=10):
    b0, w0 = np.meshgrid(np.arange(*b_range), np.arange(*w_range))
    z = np.zeros_like(b0)
    for i in range(w0.shape[0]):
        for j in range(w0.shape[1]):
            z[i][j] = compute_cost(x, y, w0[i][j], b0[i][j])

    CS = ax.contour(w0, b0, z, contours, linewidths=2,
                    colors=[dlblue, dlorange, dldarkred, dlmagenta, dlpurple])
    ax.clabel(CS, inline=1, fmt='%1.0f', fontsize=10)
    ax.set_xlabel("w");
    ax.set_ylabel("b")
    ax.set_title('Contour plot of cost J(w,b), vs b,w with path of gradient descent')
    w = w_final;
    b = b_final
    ax.hlines(b, ax.get_xlim()[0], w, lw=2, color=dlpurple, ls='dotted')
    ax.vlines(w, ax.get_ylim()[0], b, lw=2, color=dlpurple, ls='dotted')

    base = hist[0]
    for point in hist[0::step]:
        edist = np.sqrt((base[0] - point[0]) ** 2 + (base[1] - point[1]) ** 2)
        if (edist > resolution or point == hist[-1]):
            if inbounds(point, base, ax.get_xlim(), ax.get_ylim()):
                plt.annotate('', xy=point, xytext=base, xycoords='data',
                             arrowprops={'arrowstyle': '->', 'color': 'r', 'lw': 3},
                             va='center', ha='center')
            base = point
    return


def plt_house_x(X, y, f_wb=None, ax=None):
    ''' plot house with aXis '''
    if not ax:
        fig, ax = plt.subplots(1, 1)
    ax.scatter(X, y, marker='x', c='r', label="Actual Value")

    ax.set_title("Housing Prices")
    ax.set_ylabel('Price (in 1000s of dollars)')
    ax.set_xlabel(f'Size (1000 sqft)')
    if f_wb is not None:
        ax.plot(X, f_wb, c=dlblue, label="Our Prediction")
    ax.legend()


def plt_divergence(p_hist, J_hist, x_train, y_train):
    x = np.zeros(len(p_hist))
    y = np.zeros(len(p_hist))
    v = np.zeros(len(p_hist))
    for i in range(len(p_hist)):
        x[i] = p_hist[i][0]
        y[i] = p_hist[i][1]
        v[i] = J_hist[i]

    fig = plt.figure(figsize=(12, 5))
    plt.subplots_adjust(wspace=0)
    gs = fig.add_gridspec(1, 5)
    fig.suptitle(f"Cost escalates when learning rate is too large")
    # ===============
    #  First subplot
    # ===============
    ax = fig.add_subplot(gs[:2], )

    # Print w vs cost to see minimum
    fix_b = 100
    w_array = np.arange(-70000, 70000, 1000, dtype="int64")
    cost = np.zeros_like(w_array, float)

    for i in range(len(w_array)):
        tmp_w = w_array[i]
        cost[i] = compute_cost(x_train, y_train, tmp_w, fix_b)

    ax.plot(w_array, cost)
    ax.plot(x, v, c=dlmagenta)
    ax.set_title("Cost vs w, b set to 100")
    ax.set_ylabel('Cost')
    ax.set_xlabel('w')
    ax.xaxis.set_major_locator(MaxNLocator(2))

    # ===============
    # Second Subplot
    # ===============

    tmp_b, tmp_w = np.meshgrid(np.arange(-35000, 35000, 500), np.arange(-70000, 70000, 500))
    tmp_b = tmp_b.astype('int64')
    tmp_w = tmp_w.astype('int64')
    z = np.zeros_like(tmp_b, float)
    for i in range(tmp_w.shape[0]):
        for j in range(tmp_w.shape[1]):
            z[i][j] = compute_cost(x_train, y_train, tmp_w[i][j], tmp_b[i][j])

    ax = fig.add_subplot(gs[2:], projection='3d')
    ax.plot_surface(tmp_w, tmp_b, z, alpha=0.3, color=dlblue)
    ax.xaxis.set_major_locator(MaxNLocator(2))
    ax.yaxis.set_major_locator(MaxNLocator(2))

    ax.set_xlabel('w', fontsize=16)
    ax.set_ylabel('b', fontsize=16)
    ax.set_zlabel('\ncost', fontsize=16)
    plt.title('Cost vs (b, w)')
    # Customize the view angle
    ax.view_init(elev=20., azim=-65)
    ax.plot(x, y, v, c=dlmagenta)

    return


def plt_gradients(x_train, y_train, f_compute_cost, f_compute_gradient):
    # ===============
    #  First subplot
    # ===============
    # fig: 返回整个图形对象(Figure对象)，你可以用它来调整整个图形的属性
    # ax: 返回一个包含所有子图(Axes对象)的数组(这里是1行2列，所以ax是包含2个子图的数组)
    fig, ax = plt.subplots(1, 2, figsize=(12, 4))

    # Print w vs cost to see minimum
    fix_b = 100
    w_array = np.linspace(0, 400, 50, endpoint=False)
    cost = np.zeros_like(w_array)

    for i in range(len(w_array)):
        tmp_w = w_array[i]
        cost[i] = f_compute_cost(x_train, y_train, tmp_w, fix_b)
    ax[0].plot(w_array, cost, linewidth=1)
    ax[0].set_title("Cost vs w, with gradient; b set to 100")
    ax[0].set_ylabel('Cost')
    ax[0].set_xlabel('w')

    # plot lines for fixed b=100
    for tmp_w in [100, 200, 300]:
        fix_b = 100
        dj_dw, dj_db = f_compute_gradient(x_train, y_train, tmp_w, fix_b)
        j = f_compute_cost(x_train, y_train, tmp_w, fix_b)
        add_line(dj_dw, tmp_w, j, 30, ax[0])

    # ===============
    # Second Subplot
    # ===============

    tmp_b, tmp_w = np.meshgrid(np.linspace(-200, 200, 11), np.linspace(-100, 600, 11))
    U = np.zeros_like(tmp_w)
    V = np.zeros_like(tmp_b)
    for i in range(tmp_w.shape[0]):
        for j in range(tmp_w.shape[1]):
            U[i][j], V[i][j] = f_compute_gradient(x_train, y_train, tmp_w[i][j], tmp_b[i][j])
    X = tmp_w
    Y = tmp_b
    n = -2
    color_array = np.sqrt(((V - n) / 2) ** 2 + ((U - n) / 2) ** 2)

    ax[1].set_title('Gradient shown in quiver plot')
    Q = ax[1].quiver(X, Y, U, V, color_array, units='width', )
    ax[1].quiverkey(Q, 0.9, 0.9, 2, r'$2 \frac{m}{s}$', labelpos='E', coordinates='figure')
    ax[1].set_xlabel("w")
    ax[1].set_ylabel("b")


# draw derivative line
# y = m*(x - x1) + y1
def add_line(dj_dx, x1, y1, d, ax):
    x = np.linspace(x1 - d, x1 + d, 50)
    y = dj_dx * (x - x1) + y1
    ax.scatter(x1, y1, color=dlblue, s=50)
    ax.plot(x, y, '--', c=dldarkred, zorder=10, linewidth=1)
    xoff = 30 if x1 == 200 else 10
    ax.annotate(r"$\frac{\partial J}{\partial w}$ =%d" % dj_dx, fontsize=14,
                xy=(x1, y1), xycoords='data',
                xytext=(xoff, 10), textcoords='offset points',
                arrowprops=dict(arrowstyle="->"),
                horizontalalignment='left', verticalalignment='top')
