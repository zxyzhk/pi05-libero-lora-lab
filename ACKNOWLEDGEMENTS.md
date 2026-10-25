# 来源、致谢与许可证

本项目基于开源模型、社区配方和机器人基准开展工程复现。模型架构、LoRA、Flow Matching 方法与 LIBERO 任务均来自上游。本项目完成 Blackwell 运行时兼容、9,000 次后训练集成、400 回合闭环评测、视频与结果审计及展示。

| 来源 | 固定版本 | 用途与许可 |
| --- | --- | --- |
| [Physical Intelligence / openpi](https://github.com/Physical-Intelligence/openpi/tree/215abfb217dbac7d5f1273282331b9b1866c0479) | `215abfb217dbac7d5f1273282331b9b1866c0479` | π0.5、训练、Policy、LIBERO 示例；[Apache-2.0](https://github.com/Physical-Intelligence/openpi/blob/215abfb217dbac7d5f1273282331b9b1866c0479/LICENSE) |
| [Yaneosian / pi05-lora-finetune-libero](https://github.com/Yaneosian/pi05-lora-finetune-libero/tree/dcd97dcf4ac5b14f829b2085adea6ba8fdc2cf09) | `dcd97dcf4ac5b14f829b2085adea6ba8fdc2cf09` | 双 LoRA 训练配方与作者公开评测记录；该固定版本根目录未提供 LICENSE，本仓库不对其源码另行授予许可 |
| [Lifelong Robot Learning / LIBERO](https://github.com/Lifelong-Robot-Learning/LIBERO/tree/f78abd68ee283de9f9be3c8f7e2a9ad60246e95c) | `f78abd68ee283de9f9be3c8f7e2a9ad60246e95c` | 仿真任务、初始状态与任务资源；[MIT](https://github.com/Lifelong-Robot-Learning/LIBERO/blob/f78abd68ee283de9f9be3c8f7e2a9ad60246e95c/LICENSE) |
| [Hugging Face / LeRobot](https://github.com/huggingface/lerobot/tree/0cf864870cf29f4738d3ade893e6fd13fbd7cdb5) | `0cf864870cf29f4738d3ade893e6fd13fbd7cdb5` | 机器人数据接口；[Apache-2.0 及其附带第三方声明](https://github.com/huggingface/lerobot/blob/0cf864870cf29f4738d3ade893e6fd13fbd7cdb5/LICENSE) |
| [physical-intelligence/libero 数据集](https://huggingface.co/datasets/physical-intelligence/libero/tree/a4336d589d589045d1c56423ffdf3b88a0e19b1f) | `a4336d589d589045d1c56423ffdf3b88a0e19b1f` | 本次训练数据快照；下载、使用及再分发应以数据源的条款为准 |

感谢 JAX、Flax、Orbax、PyTorch、MuJoCo、robosuite 等项目提供训练、检查点和仿真基础设施；各组件及模型权重保留原有许可。

`reproduction/` 中的配置参数与社区方案对应，工具代码来自本项目真实运行的集成与审计脚本，可移植改动和来源哈希见 [SOURCE_PROVENANCE.json](reproduction/SOURCE_PROVENANCE.json)。没有复制社区仓库的模型权重或完整训练脚本，也没有给上游文件统一添加 MIT 许可证。

原创展示文档与本项目新增集成代码：Copyright © 2026 zxyzhk。上游版权声明、组件许可证与模型使用条件不因本仓库的展示而改变。
