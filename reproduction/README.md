# 复用范围

这里提供两份从已执行代码摘取的轻量工具，使用 Python 3.11+ 与标准库；不包含下载凭据、托管设备地址、训练数据或权重。

| 工具 | 来源与用途 | 公开版本验证 |
| --- | --- | --- |
| `register_community_config.py` | 实际训练使用的配置添加片段，保留相同模型、freeze filter、数据与优化器参数 | 编译；在固定上游 config.py 副本上验证 dry-run、写入与幂等性 |
| `audit_suite.py` | 已执行 400 回合 controller 的严格 suite 核验逻辑与评分函数 | 编译；在本次四套件完整本地证据上重新执行，确认 98 / 98 / 94 / 81 |

来源文件 SHA、固定版本与可移植修改记录见 [SOURCE_PROVENANCE.json](SOURCE_PROVENANCE.json)。`recipe.json` 是本次实验的参数摘要。公开打包没有重新运行模型训练或 GPU 评测，不宣称可在任意新环境一键重现分数。

配置片段沿用 openpi API；相关上游许可保留在 [licenses/openpi-LICENSE.txt](licenses/openpi-LICENSE.txt)，完整署名见仓库根目录的 [ACKNOWLEDGEMENTS.md](../ACKNOWLEDGEMENTS.md)。

## 配置准备

在独立环境中检出 [openpi 固定版本](https://github.com/Physical-Intelligence/openpi/tree/215abfb217dbac7d5f1273282331b9b1866c0479)，按上游文档准备其依赖、基座权重与数据。

```bash
python3 reproduction/register_community_config.py --project-root ./openpi
python3 reproduction/register_community_config.py --project-root ./openpi --apply
```

第一条只检查预期差异，第二条写入配置。脚本要求原文件 SHA 精确匹配固定上游版本；生成的配置文件 SHA 与本次真实训练配置相同。它不自动安装 Blackwell 兼容环境、下载模型或计算 normalization stats。

配置保留社区原始 `num_train_steps=30000` 与学习率 `decay_steps=30000`。本次实际运行通过 CLI 将终点设置为 9,000，关键参数如下：

```bash
python scripts/train.py pi05_libero_lora_community \
  --exp-name new-libero-9k \
  --batch-size 64 --num-train-steps 9000 --seed 42
```

这条命令需要先完成上游环境、数据和统计量准备。本次已报告训练在 2,501 次更新后使用官方 `--resume` 恢复，DataLoader 从 seed 42 起点重启；从头直接训练 9k 不能被称为逐位相同的轨迹。

## 审计一套 100 回合结果

输入是本项目评测工具生成的一个完整 attempt 目录，包含 `episodes.jsonl`、`episode-timings.jsonl`、`summary.json`、`evaluation.log`、`server.log` 和 100 个唯一 rollout 视频。允许移动外层目录，需保留 attempt 目录名以核对原 summary 的逻辑路径。工具不需要 GPU，也不启动仿真。

```bash
python3 reproduction/audit_suite.py \
  --attempt ./my-evaluation/libero_spatial/attempt \
  --suite libero_spatial \
  --binding YOUR_BINDING_SHA256 \
  --output ./spatial-audit.json
```

它独立重算完整 task / trial 覆盖、成功数、Wilson 区间与逐任务成绩，检查 runtime errors、控制步范围、视频和环境关闭，并生成相对路径及文件 SHA。该工具核验现有记录与文件一致性，不解码视频，也不能单凭日志证明未被记录的训练历史。
