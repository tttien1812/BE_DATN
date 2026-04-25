from pyannote.audio import Pipeline
from dotenv import load_dotenv
import os
import sys
import librosa
import torch

load_dotenv()

HF_TOKEN = os.getenv("HF_TOKEN")

if not HF_TOKEN:
    raise ValueError("Missing HF_TOKEN in .env")

pipeline = Pipeline.from_pretrained(
    "pyannote/speaker-diarization-3.1",
    token=HF_TOKEN
)

if len(sys.argv) < 2:
    raise ValueError("Please provide audio file path")

audio_path = sys.argv[1]

print("Loading audio with librosa...")

waveform, sample_rate = librosa.load(audio_path, sr=16000)

waveform = torch.tensor(waveform).unsqueeze(0)

audio_data = {
    "waveform": waveform,
    "sample_rate": sample_rate
}

print("Running diarization...")

diarization = pipeline(audio_data)

print("Result:")

for segment, speaker in diarization.speaker_diarization:
    print(f"{segment.start:.1f}s - {segment.end:.1f}s: {speaker}")