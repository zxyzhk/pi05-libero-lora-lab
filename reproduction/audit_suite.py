#!/usr/bin/env python3
"""CPU-only suite audit extracted from the evaluator used for the 400 rollouts.

Copyright (c) 2026 zxyzhk. This file never trains, serves, controls or shuts down a device.
The portable extraction was rechecked against the recorded suite artifacts on CPU.
Original file hashes and the exact extraction scope are in SOURCE_PROVENANCE.json.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import re

SUITES = {"libero_spatial": 220, "libero_object": 280, "libero_goal": 300, "libero_10": 520}
TRIALS = 10
BAD_LOG = ('Traceback (most recent call last):', 'Exception ignored in:', 'EGL_NOT_INITIALIZED', 'Caught exception:', 'video_write:')
TIMING_NOTE = 'Episode timing observes durable JSONL completion at about 1s polling. Intervals include environment setup, simulation, policy requests and video encoding; first interval also includes evaluator startup. Batched observations have no individual duration. Pure model forward latency was not measured.'


def require(value, message):
    if not value:
        raise RuntimeError(message)


def read_json(path):
    return json.loads(path.read_text())


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def file_record(path, relative_to):
    require(path.is_file() and not path.is_symlink(), f"Missing or symlinked evidence file: {path}")
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(8 * 1024 * 1024), b""):
            h.update(chunk)
    return {"path": str(path.relative_to(relative_to)), "bytes": path.stat().st_size, "sha256": h.hexdigest()}


def wilson(successes, episodes):
    z = 1.959963984540054
    p = successes / episodes
    denominator = 1 + z * z / episodes
    center = (p + z * z / (2 * episodes)) / denominator
    half = z * math.sqrt(p * (1 - p) / episodes + z * z / (4 * episodes * episodes)) / denominator
    return [max(0.0, center - half), min(1.0, center + half)]


def score(rows):
    successes = sum(row["success"] for row in rows)
    return {"episodes": len(rows), "successes": successes, "success_rate": successes / len(rows),
            "wilson95": wilson(successes, len(rows)), "simulator_control_steps": sum(row["steps"] for row in rows)}


def rows(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line]


def validate_suite(attempt, suite, binding):
    attempt = attempt.resolve()
    data = rows(attempt / 'episodes.jsonl')
    expected = {(task, trial) for task in range(10) for trial in range(TRIALS)}
    require(len(data) == 100, 'Expected exactly 100 episodes per suite')
    keys = [(row['task_id'], row['episode_idx']) for row in data]
    require(len(set(keys)) == 100 and set(keys) == expected, 'Missing/duplicate task-trial coverage')
    for row in data:
        require(type(row['task_id']) is int and type(row['episode_idx']) is int
                       and row.get('suite') == suite and row.get('seed') == 7
                       and 'error' in row and row['error'] is None, 'Episode identity/error mismatch')
        require(type(row.get('success')) is bool and type(row.get('steps')) is int
                       and 10 < row['steps'] <= SUITES[suite] + 10, 'Invalid outcome/control steps')
        require(row['success'] or row['steps'] == SUITES[suite] + 10, 'Unexplained early task failure')
        clips = list(attempt.glob(f"rollout_task{row['task_id']:02d}_episode{row['episode_idx']:03d}_*.mp4"))
        require(len(clips) == 1 and clips[0].is_file() and not clips[0].is_symlink()
                       and clips[0].stat().st_size > 0, 'Missing/duplicate/empty episode video')
    videos = sorted(attempt.glob('*.mp4'))
    require(len(videos) == 100, 'Unexpected extra/missing video')
    summary = read_json(attempt / 'summary.json')
    result_score = score(data)
    expected_summary = dict(suite=suite, seed=7, task_ids=list(range(10)), num_trials_per_task=10,
                            total_episodes=100, total_successes=result_score['successes'], episodes_with_errors=0,
                            max_steps=SUITES[suite], num_steps_wait=10, replan_steps=5)
    require(all(summary.get(key) == value for key, value in expected_summary.items())
                   and math.isclose(summary['success_rate'], result_score['success_rate'], abs_tol=1e-12)
                   and Path(summary['episodes_path']).name == 'episodes.jsonl'
                   and Path(summary['episodes_path']).parent.name == attempt.name, 'Summary protocol/count mismatch')
    log = (attempt / 'evaluation.log').read_text(errors='replace')
    closed = [int(value) for value in re.findall(r'Closed LIBERO task (\d+) environment', log)]
    require(sorted(closed) == list(range(10)) and not any(text in log for text in BAD_LOG), 'Evaluator runtime/env-close error')
    server_log = (attempt / 'server.log').read_text(errors='replace')
    require(not any(text in server_log for text in BAD_LOG), 'Server runtime/cleanup traceback')
    timing = rows(attempt / 'episode-timings.jsonl')
    require(len(timing) == 100 and {(row['task_id'], row['episode_idx']) for row in timing} == expected,
                   'Episode timing coverage mismatch')
    for item in timing:
        duration = item.get('episode_wall_seconds_observed_interval')
        require(type(item.get('task_id')) is int and type(item.get('episode_idx')) is int
                       and item.get('binding_sha256') == binding and item.get('suite') == suite and item.get('seed') == 7
                       and type(item.get('observation_batch_size')) is int and item['observation_batch_size'] > 0
                       and type(item.get('observation_interval_wall_seconds')) in (float, int)
                       and math.isfinite(item['observation_interval_wall_seconds']) and item['observation_interval_wall_seconds'] >= 0
                       and type(item.get('completed_observed_elapsed_seconds')) in (float, int)
                       and math.isfinite(item['completed_observed_elapsed_seconds'])
                       and item['completed_observed_elapsed_seconds'] >= 0
                       and ((item['observation_batch_size'] == 1 and type(duration) in (float, int)
                             and math.isfinite(duration) and duration >= 0)
                            or (item['observation_batch_size'] > 1 and duration is None)), 'Invalid timing evidence')
    artifacts = [file_record(attempt / name, attempt) for name in
                 ('episodes.jsonl', 'episode-timings.jsonl', 'summary.json', 'evaluation.log', 'server.log')]
    return dict(suite=suite, **result_score, video_count=100, videos=[file_record(path, attempt) for path in videos],
                artifacts=artifacts, timing_note=TIMING_NOTE,
                tasks=[dict(task_id=task, **score([row for row in data if row['task_id'] == task])) for task in range(10)])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--attempt', type=Path, required=True, help='One completed suite attempt directory')
    parser.add_argument('--suite', choices=tuple(SUITES), required=True)
    parser.add_argument('--binding', required=True, help='Binding SHA from this attempt receipt')
    parser.add_argument('--output', type=Path, help='Optional new sanitized audit JSON; never overwrites')
    args = parser.parse_args()
    result = validate_suite(args.attempt, args.suite, args.binding)
    if args.output:
        with args.output.open('x') as stream:
            json.dump(result, stream, ensure_ascii=False, indent=2)
            stream.write('\n')
    print(json.dumps(dict(suite=args.suite, episodes=result['episodes'], successes=result['successes'],
                         success_rate=result['success_rate'], wilson95=result['wilson95'])))


if __name__ == '__main__':
    main()
