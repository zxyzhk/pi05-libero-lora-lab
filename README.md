# π0.5 LIBERO LoRA Lab

**单张 Blackwell 96GB，完成 π0.5 社区 LoRA 配方的 9,000 次后训练更新，在全部 40 个 LIBERO 任务、400 回合闭环评测中取得 92.75% 成功率。**

[查看交互展示、训练曲线与任务视频 →](https://zxyzhk.github.io/pi05-libero-lora-lab/) · [实验协议与结果](EXPERIMENT_REPORT.md) · [可复用配置与审计工具](reproduction/) · [来源与致谢](ACKNOWLEDGEMENTS.md)

本项目完成了从预训练模型、真实机器人轨迹数据到闭环评测的工程链路：

- **训练与硬件适配**：保留 openpi 模型实现，在 RTX PRO 6000 Blackwell 上完成 JAX/BF16 兼容验收与 native batch 64 后训练。
- **闭环与可追溯结果**：四套件覆盖全部 40 个任务，每任务 10 个初始状态；保存逐回合结果与视频，核验异常、任务覆盖和环境释放。
- **检查点完整性**：最终检查点 `8999` 对应实际 9,000 次更新；严格恢复完整优化器状态，核对 step、Adam 与学习率计数及文件哈希。

## 评测结果

| 套件 | 成功 / 回合 | 成功率 |
| --- | ---: | ---: |
| LIBERO-Spatial | 98 / 100 | 98.00% |
| LIBERO-Object | 98 / 100 | 98.00% |
| LIBERO-Goal | 94 / 100 | 94.00% |
| LIBERO-Long (`libero_10`) | 81 / 100 | 81.00% |
| **合计：40 个任务** | **371 / 400** | **92.75%** |

评测运行错误 **0**，完整评测控制器 wall time 为 **45 分 15.86 秒**。任务视频、逐任务得分与失败回合见[展示页](https://zxyzhk.github.io/pi05-libero-lora-lab/)。

这是单训练种子、仿真内的 9k / 400 回合阶段结果；真机、分布外泛化和多种子稳定性尚未验证。

## 本地预览

在仓库根目录运行：

```bash
python3 -m http.server --directory docs
```

在浏览器打开终端提示的本地地址。展示页是静态文件，预览无需 GPU。

## 目录

```text
docs/                       静态展示、公开结果与精选视频
reproduction/               可移植配置注册器、CPU 评测审计工具与来源记录
EXPERIMENT_REPORT.md         完整训练 / 评测协议与测量口径
ACKNOWLEDGEMENTS.md          上游版本、贡献边界与许可证来源
```

## 复现范围

使用 `pi05_base` 初始化，参考固定版本的社区双 LoRA 配方：VLM rank 16、action expert rank 32，并保留上游 freeze filter 中可训练的 vision / projection 分支。模型架构、LoRA 方法和 LIBERO 基准来自上游；本项目贡献是兼容适配、训练集成、闭环评测和证据审计。

公开仓库提供已执行代码的可移植摘取及脱敏结果，不包含训练数据和模型权重。新打包脚本已做编译及 CPU 检查，完整 GPU 环境仍需按固定版本准备；具体见 [reproduction/README.md](reproduction/README.md)。

Copyright © 2026 zxyzhk. 上游组件保留各自的许可证和署名。
