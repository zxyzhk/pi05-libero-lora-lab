# π0.5 LoRA：9,000 次更新与 400 回合 LIBERO 闭环评测

本次训练得到的检查点在 400 回合中完成 371 回合，成功率 **92.75%**。四个套件、40 个任务全部纳入评测，每任务固定 10 个初始状态，没有按成绩筛选任务或回合。

## 1. 来源与实验对象

| 组件 | 固定版本 / 用途 |
| --- | --- |
| [Physical Intelligence openpi](https://github.com/Physical-Intelligence/openpi/tree/215abfb217dbac7d5f1273282331b9b1866c0479) | `215abfb217dbac7d5f1273282331b9b1866c0479`；模型、训练、Policy 与 LIBERO 控制逻辑 |
| [社区 π0.5 LoRA 方案](https://github.com/Yaneosian/pi05-lora-finetune-libero/tree/dcd97dcf4ac5b14f829b2085adea6ba8fdc2cf09) | `dcd97dcf4ac5b14f829b2085adea6ba8fdc2cf09`；双 LoRA 配方与作者公开结果 |
| [LIBERO](https://github.com/Lifelong-Robot-Learning/LIBERO/tree/f78abd68ee283de9f9be3c8f7e2a9ad60246e95c) | `f78abd68ee283de9f9be3c8f7e2a9ad60246e95c`；任务与仿真 |
| [LeRobot](https://github.com/huggingface/lerobot/tree/0cf864870cf29f4738d3ade893e6fd13fbd7cdb5) | `0cf864870cf29f4738d3ade893e6fd13fbd7cdb5`；数据加载 |
| [训练数据](https://huggingface.co/datasets/physical-intelligence/libero/tree/a4336d589d589045d1c56423ffdf3b88a0e19b1f) | `physical-intelligence/libero`，revision `a4336d589d589045d1c56423ffdf3b88a0e19b1f` |

初始化使用 `pi05_base`。没有将已经针对 LIBERO 后训练的官方 `pi05_libero` 权重作为本次训练起点。数据快照包含 1,693 个 episode、273,465 帧；规范化采用固定上游 DataLoader 的统计路径，`drop_last` 后统计 4,272 个 batch × 64，即 273,408 帧。

## 2. 训练配置与实际过程

| 项目 | 实际设置 |
| --- | --- |
| GPU | 1 × NVIDIA RTX PRO 6000 Blackwell，96GB |
| 模型与精度路径 | π0.5，JAX 训练；完成 BF16 与真实样本训练 / 恢复 / 推理验收 |
| 本次完成的优化器更新 | **9,000** |
| batch | **64 native batch**，不使用梯度累积 |
| 训练随机种子 | **42**；这是本地选择，社区作者未披露可匹配的训练种子 |
| LoRA | VLM rank **16**；action expert rank **32** |
| 可训练范围 | 上游 LoRA freeze filter；包含部分 vision / projection 参数，不能称为仅训练 adapter |
| 优化器 | AdamW，global gradient norm clip 1.0，EMA 关闭 |
| 学习率 | warmup 1,000；peak `5e-5`；cosine decay 30,000；end `5e-6` |
| action horizon | 10 |
| state 输入 | `discrete_state_input=False` |

Blackwell 兼容环境使用 JAX / jaxlib / CUDA12 plugin `0.6.2`、Flax `0.10.2`、Orbax `0.11.18`；原 openpi 模型源码保留。依赖适配是本地运行时调整，不作为新模型算法贡献。

实际过程包含一次从已提交检查点恢复：

1. 初始阶段保留到 `state.step=2501`，检查点目录名为 `2500`。
2. 使用官方完整 `--resume` 路径，恢复模型参数、Adam 状态和优化器计数。
3. 将运行终点设置为 `num_train_steps=9000`，保留原 30,000 步学习率衰减计划；最终提交检查点目录 `8999`。

上游保存目录使用训练循环的零起始 index，因此 **目录 `8999` 对应完成 9,000 次更新**。恢复不会保存 DataLoader 的当前位置；seed 42 的 shuffled sampler 从起点重新开始。本次结果不能称为与不间断训练 bitwise 等价。

训练曲线使用 90 个真实日志点。首个记录 loss 为 `0.0939`；最后记录为完成 8,901 次更新时的 `0.0175`，没有补造第 9,000 次更新的 loss。训练 loss 只用于观察优化过程，不代表验证集指标或闭环成功率。

## 3. 检查点与优化器验收

最终状态使用独立 CPU 路径严格恢复完整序列化 `train_state`：

- `state.step`、Adam counter、学习率 schedule counter 均为 **9,000**。
- 恢复 105 个数值数组，核对形状、dtype、完整树结构与有限值；缺失数据块按错误处理。
- 核验当前 `train_state` 文件库存与通过验收时的 SHA-256 一致；Policy 使用检查点自己的 normalization assets。
- 评测绑定模型参数 / assets 文件哈希、源码版本、规范化来源及 CPU 验收凭证。

CPU 验收凭证 SHA-256：

```text
5f578f0cf375563a617960297c65fb54c9ae8bf0a54b58259a8ad6c72f4c28d9
```

完整优化器树的数组元素数同时包含 Adam 的多份状态，不能用作可训练参数数量。本报告不据此报告参数压缩比。

## 4. 闭环评测协议

| 设置 | 值 |
| --- | --- |
| 检查点 | 本次 9,000 次更新，目录 `8999` |
| 套件 | `libero_spatial`、`libero_object`、`libero_goal`、`libero_10` |
| 覆盖 | 每套 10 个任务 × 每任务 10 回合，共 **400** 回合 |
| 初始状态 | 上游任务提供的前 10 个固定初始状态 |
| environment seed | 7 |
| 图像处理 | 上游相机 / 观测预处理，resize 224 |
| action chunk / replan | horizon 10；每 5 个控制步重新请求动作 |
| Flow integration | 上游默认 **10** 步，与 action horizon 是独立设置 |
| settling | 10 个初始控制步 |
| 策略随机流 | 每套件启动全新官方 Policy，PRNG seed 0 |
| 最大策略控制步 | Spatial 220；Object 280；Goal 300；Long 520，另加 10 settling 步 |

评测沿用固定 openpi LIBERO 示例的控制和观测路径，增加逐回合 JSONL、唯一视频文件、summary、异常记录和每任务显式环境关闭。只在一个套件的全部 100 回合、视频与错误核验通过后写入完成凭证。中断套件应在新目录重跑全部 100 回合；不拼接好成绩回合。

完成验收确认：400 个 task / trial 唯一组合、400 份非空视频、0 个运行错误，任务环境全部显式释放。较早单回合的工程验收与本次 400 回合分开，不计入成功数。

## 5. 结果与测量口径

| 套件 | 成功 / 回合 | 成功率 | 近似 95% Wilson 区间 |
| --- | ---: | ---: | ---: |
| Spatial | 98 / 100 | 98.00% | 93.00%–99.45% |
| Object | 98 / 100 | 98.00% | 93.00%–99.45% |
| Goal | 94 / 100 | 94.00% | 87.52%–97.22% |
| Long | 81 / 100 | 81.00% | 72.22%–87.49% |
| **整体** | **371 / 400** | **92.75%** | **89.78%–94.90%** |

29 个未成功回合中，19 个来自 Long 套件。展示页保留成功和失败样例，便于查看长程多物体操作的实际完成情况。对失败机制的讨论基于具体轨迹，不能仅凭套件分数断言因果。

Wilson 区间以当前检查点、固定任务和初始状态为条件，同任务回合可能相关；它不估计训练种子方差或分布外泛化。

| 时间指标 | 结果 |
| --- | ---: |
| 完整评测控制器 wall time | **2,715.86 秒（45 分 15.86 秒）** |
| 四套件 evaluator wall time 之和 | 2,645.20 秒 |
| JSONL 完成观察间隔：mean | 6.61 秒 |
| JSONL 完成观察间隔：P50 | 5.02 秒 |
| JSONL 完成观察间隔：P95 | 15.06 秒 |
| 纯模型 forward latency | **未测量** |

完成观察间隔由约 1 秒轮询持久化 episode JSONL 得到，包含仿真、Policy 请求、环境切换与视频编码；首个回合还包含 evaluator 启动。它不是纯模型前向延迟或 action-chunk 推理延迟。视频按 10fps 编码，播放时长也不是实际 rollout wall time。

## 6. 复现范围与公开材料

本项目的完成范围是 **9k 更新 + 400 回合**。社区原方案的 30k 更新 / 2,000 回合与本次范围不同；其作者报告分数不能在不控制训练与评测协议差异的情况下作直接增益对比。本次尚未验证真机、多训练种子或 OOD 能力。

`reproduction/` 提供从真实执行来源摘取的配置注册器和独立 CPU suite 审计器，保存来源 SHA 与可移植调整说明。它们不包含训练数据、模型权重或托管环境的一键安装承诺。新的公开打包版本只做编译和 CPU 检查；已执行的训练与 400 回合结果来自上述固定环境。

[展示页与视频](https://zxyzhk.github.io/pi05-libero-lora-lab/) · [代码摘取与验证范围](reproduction/README.md) · [署名与许可证](ACKNOWLEDGEMENTS.md)
