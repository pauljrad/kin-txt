#!/usr/bin/env python3
"""
Pre-generate every sound the app can make, for one or more voices.

    python3 scripts/generate-audio.py bf_emma bm_george

Reads scripts/audio-texts.json (from dump-audio-texts.ts) and writes
public/audio/<voice>/<rate>/<sha256(text)>.mp3 — the same path the app
computes at runtime, so a word is a plain file fetch. Existing files
are skipped, so re-running only makes what is new.

Uses Kokoro (Apache 2.0) through kokoro-onnx. Needs, once:
    python3 -m venv tts-env && tts-env/bin/pip install kokoro-onnx soundfile
    kokoro-v1.0.onnx + voices-v1.0.bin from the kokoro-onnx releases
    ffmpeg (brew install ffmpeg)
"""
import hashlib, json, os, subprocess, sys, time
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
MODEL_DIR = Path(os.environ.get("KOKORO_DIR", HERE / "kokoro"))
OUT = ROOT / "public" / "audio"

SPEED = {"slow": 0.85, "normal": 0.95}   # words and letters a touch slower
PAD_S = 0.06                              # silence to leave at each end


def sha(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def trim(samples: np.ndarray, sr: int, thresh: float = 0.01) -> np.ndarray:
    """Cut leading/trailing silence, keep a little padding so letters don't clip."""
    loud = np.flatnonzero(np.abs(samples) > thresh)
    if loud.size == 0:
        return samples
    pad = int(sr * PAD_S)
    a = max(0, loud[0] - pad)
    b = min(len(samples), loud[-1] + pad)
    return samples[a:b]


def to_mp3(samples: np.ndarray, sr: int, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    wav = dest.with_suffix(".wav")
    sf.write(wav, samples, sr)
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav),
         "-codec:a", "libmp3lame", "-b:a", "32k", "-ac", "1", "-ar", str(sr), str(dest)],
        check=True,
    )
    wav.unlink()


def main(voices: list[str]) -> None:
    texts = json.loads((HERE / "audio-texts.json").read_text())
    k = Kokoro(str(MODEL_DIR / "kokoro-v1.0.onnx"), str(MODEL_DIR / "voices-v1.0.bin"))
    known = set(k.get_voices())

    for voice in voices:
        if voice not in known:
            sys.exit(f"unknown voice {voice}; British ones: {sorted(v for v in known if v[:2] in ('bf','bm'))}")
        t0 = time.time()
        made = skipped = 0
        total_s = 0.0
        for rate, items in texts.items():
            for text in items:
                dest = OUT / voice / rate / f"{sha(text)}.mp3"
                if dest.exists():
                    skipped += 1
                    continue
                samples, sr = k.create(text, voice=voice, speed=SPEED[rate], lang="en-gb")
                samples = trim(np.asarray(samples, dtype=np.float32), sr)
                to_mp3(samples, sr, dest)
                made += 1
                total_s += len(samples) / sr
                if made % 100 == 0:
                    print(f"  {voice}: {made} made…", flush=True)
        size = sum(p.stat().st_size for p in (OUT / voice).rglob("*.mp3")) / 1e6
        print(f"{voice}: {made} made, {skipped} kept, {total_s/60:.1f} min of new audio, "
              f"{size:.1f}MB on disk, {time.time()-t0:.0f}s", flush=True)


if __name__ == "__main__":
    main(sys.argv[1:] or ["bf_emma"])
