"""Render seamless 16-beat sample pads for Flux's seven additional worlds.

All loops use the same C3 reference pitch as Bloom; playback transposes them.
Run with Python + numpy/scipy and ffmpeg. Existing Bloom/voice assets are kept.
"""
from pathlib import Path
import subprocess
import tempfile
import numpy as np
from scipy.io.wavfile import write

OUT = Path(__file__).resolve().parents[1] / 'audio'
SR = 32000
T = np.arange(SR * 12) / SR
F = round(130.8128 * 12) / 12
# Overtone weights, chorus amount, octave sheen, breathing depth.
WORLDS = {
    'prism': ([1, .30, .13, .055], .26, .10, .12),
    'undertow': ([1, .14, .045], .31, .025, .24),
    'halo': ([1, .25, .095, .035], .38, .14, .14),
    'nightglass': ([1, .18, .09, .04, .018], .22, .075, .19),
    'tension': ([1, .28, .12, .065, .024], .24, .055, .16),
    'abyss': ([1, .09, .025], .36, .035, .26),
    'radiance': ([1, .29, .14, .06, .025], .33, .17, .13),
}
for name, (weights, chorus, sheen, depth) in WORLDS.items():
    stereo = np.zeros((len(T), 2))
    for c in range(2):
        phase = 2*np.pi*F*T + .035*np.sin(2*np.pi*T/12 + c*.65)
        tone = sum(w*np.sin((i+1)*phase + .025*i*np.sin(2*np.pi*T/6))
                   for i, w in enumerate(weights))
        tone += chorus*np.sin(2*np.pi*(F + (1 if c else -1)/6)*T + c*.4)
        tone += sheen*np.sin(4*np.pi*F*T + .08*np.sin(2*np.pi*T/12 + c))
        stereo[:, c] = tone*(.76 + depth*np.sin(2*np.pi*T/6 + c*.45))
    stereo *= .47/np.max(np.abs(stereo))
    assert np.isfinite(stereo).all()
    # Continuous periodic components make start/end neighbours a smooth loop seam.
    assert np.max(np.abs(stereo[0]-stereo[-1])) < .035
    with tempfile.NamedTemporaryFile(suffix='.wav') as tmp:
        write(tmp.name, SR, (stereo*32767).astype(np.int16))
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp.name,
                        '-c:a', 'libmp3lame', '-b:a', '128k',
                        str(OUT / f'{name}-pad-c3.mp3')], check=True)
    print(name)
