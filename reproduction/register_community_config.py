#!/usr/bin/env python3
"""Portable version of the training-config addition used in the recorded run.

Copyright (c) 2026 zxyzhk. Upstream APIs and recipe attribution: ../ACKNOWLEDGEMENTS.md.
No model is imported. Default is a dry run; --apply changes the supplied checkout.
Source lineage and portability changes: SOURCE_PROVENANCE.json.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys

ORIGINAL_SHA256 = 'c34231f888dba5dc981d808765b3d98775ab845b04313bf53fcecd567c520b0d'
PATCHED_SHA256 = '4d728a07ee680efc208fc8083b3032a27de7c4c8ef26b8613111757be13217b1'
NAME = 'pi05_libero_lora_community'
MARKER = '    #\n    # Fine-tuning Aloha configs.\n'
BLOCK = '''    # Community LoRA recipe, pinned and audited in ../manifests/provenance.json.
    # This retains the upstream freeze-filter semantics (including vision/projections).
    TrainConfig(
        name="pi05_libero_lora_community",
        model=pi0_config.Pi0Config(
            pi05=True, action_horizon=10, discrete_state_input=False,
            paligemma_variant="gemma_2b_lora", action_expert_variant="gemma_300m_lora",
        ),
        data=LeRobotLiberoDataConfig(
            repo_id="physical-intelligence/libero",
            base_config=DataConfig(prompt_from_task=True),
            extra_delta_transform=False,
        ),
        weight_loader=weight_loaders.CheckpointWeightLoader(
            "gs://openpi-assets/checkpoints/pi05_base/params"
        ),
        batch_size=64,
        num_train_steps=30_000,
        lr_schedule=_optimizer.CosineDecaySchedule(
            warmup_steps=1_000, peak_lr=5e-5, decay_steps=30_000, decay_lr=5e-6,
        ),
        optimizer=_optimizer.AdamW(clip_gradient_norm=1.0),
        ema_decay=None,
        freeze_filter=pi0_config.Pi0Config(
            pi05=True, action_horizon=10, discrete_state_input=False,
            paligemma_variant="gemma_2b_lora", action_expert_variant="gemma_300m_lora",
        ).get_freeze_filter(),
        save_interval=2_500,
        keep_period=5_000,
        wandb_enabled=False,
    ),
'''


def prepare(source):
    digest = hashlib.sha256(source.encode()).hexdigest()
    if digest == PATCHED_SHA256:
        return source, False
    if digest != ORIGINAL_SHA256 or source.count(MARKER) != 1 or ('name="' + NAME + '"') in source:
        raise RuntimeError('Expected the unchanged config.py from the pinned openpi revision')
    result = source.replace(MARKER, BLOCK + MARKER, 1)
    compile(result, 'config.py', 'exec')
    if hashlib.sha256(result.encode()).hexdigest() != PATCHED_SHA256:
        raise RuntimeError('Generated config does not match the configuration used in the recorded run')
    return result, True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project-root', type=Path, required=True, help='Pinned openpi checkout root')
    parser.add_argument('--apply', action='store_true', help='Write the verified config addition; otherwise dry-run')
    args = parser.parse_args()
    if sys.version_info < (3, 11):
        parser.error('Python 3.11+ is required to parse the pinned openpi configuration')
    destination = args.project_root.expanduser().resolve() / 'src/openpi/training/config.py'
    source = destination.read_text()
    result, changed = prepare(source)
    if args.apply and changed:
        destination.write_text(result)
    print(json.dumps(dict(config_name=NAME, file='src/openpi/training/config.py',
        action='applied' if args.apply and changed else ('already_matches' if not changed else 'dry_run'),
        original_sha256=hashlib.sha256(source.encode()).hexdigest(),
        expected_result_sha256=hashlib.sha256(result.encode()).hexdigest())))


if __name__ == '__main__':
    main()
