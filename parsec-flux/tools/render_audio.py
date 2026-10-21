"""Render Bloom sample instruments and filter-bank-vocoded robot announcements.
Requires numpy, scipy, ffmpeg and the system Flite rms voice library.
"""
from pathlib import Path
import ctypes as C
import tempfile, subprocess
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, resample_poly
OUT=Path(__file__).resolve().parents[1]/'audio'
OUT.mkdir(exist_ok=True)
sr=32000

def save(name,x):
    x=np.asarray(x)
    assert np.isfinite(x).all()
    peak=np.max(np.abs(x))
    if peak>.95: x=x*.95/peak
    with tempfile.NamedTemporaryFile(suffix='.wav') as f:
        wavfile.write(f.name,sr,(x*32767).astype(np.int16))
        subprocess.run(['ffmpeg','-y','-loglevel','error','-i',f.name,'-c:a','libmp3lame','-b:a','128k',str(OUT/(name+'.mp3'))],check=True)

# All loop components complete whole cycles over 16 beats at 80 BPM (12 s).
t=np.arange(sr*12)/sr
f=round(130.8128*12)/12
pad=np.zeros((len(t),2))
for c in range(2):
    p=2*np.pi*f*t+.025*np.sin(2*np.pi*t/12+c*.5)
    pad[:,c]=.28*(np.sin(p)+.34*np.sin(2*np.pi*(f+1/6)*t+c*.4)+.13*np.sin(2*p))*(.76+.18*np.sin(2*np.pi*t/6+c*.4))
save('bloom-pad-c3',pad)
u=np.arange(sr*12)/sr
f=523.251
bell=(1-np.exp(-u/.012))*np.exp(-u/4)*(np.sin(2*np.pi*f*u)+.22*np.exp(-u/.4)*np.sin(2*np.pi*f*2.01*u))*.65
save('bloom-glass-c5',bell)
bass=np.zeros(len(t))
for onset in np.arange(-1.5,12,1.5):
    u=t-onset
    e=np.where(u>=0,(1-np.exp(-np.maximum(u,0)/.045))*np.exp(-np.maximum(u,0)/.6),0)
    bass+=.32*e*(np.sin(2*np.pi*(round(65.406*12)/12)*u)+.15*np.sin(2*np.pi*f/4*u))
save('bloom-heartbeat',np.column_stack([bass,bass]))

# Flite speech is the modulator; harmonic carrier supplies the robotic pitch.
fl=C.CDLL('libflite.so.1'); vl=C.CDLL('libflite_cmu_us_rms.so.1')
fl.flite_init()
vl.register_cmu_us_rms.restype=C.c_void_p
voice=vl.register_cmu_us_rms(None)
fl.flite_text_to_speech.argtypes=[C.c_char_p,C.c_void_p,C.c_char_p]
fl.flite_text_to_speech.restype=C.c_float
rng=np.random.default_rng(42)
worlds=['Bloom','Prism','Undertow','Halo','Nightglass','Tension','Abyss','Radiance']
words=['one','two','three','four','five','six','seven','eight']
phrases={**{f'world-{i+1}':f'World {words[i]}. {w}.' for i,w in enumerate(worlds)},'one-life':'One life remaining.','two-lives':'Two lives remaining.','game-over':'Game over.'}
for name,phrase in phrases.items():
    with tempfile.NamedTemporaryFile(suffix='.wav') as f:
        fl.flite_text_to_speech(phrase.encode(),voice,f.name.encode())
        r,x=wavfile.read(f.name)
    x=x.astype(float)/32768
    x=resample_poly(x,sr,r)
    x=np.pad(x,(0,int(.5*sr)))
    tt=np.arange(len(x))/sr
    carrier=sum(np.sin(2*np.pi*110*k*tt)/np.sqrt(k) for k in range(1,70))*.11
    y=np.zeros(len(x))
    edges=np.geomspace(100,11000,23)
    for lo,hi in zip(edges[:-1],edges[1:]):
        band=butter(2,[lo,hi],btype='bandpass',fs=sr,output='sos')
        env=sosfilt(butter(2,35,fs=sr,output='sos'),np.abs(sosfilt(band,x)))
        y+=sosfilt(band,carrier)*env*20
    # Original consonants retain clarity through the vocoder.
    y=.76*y+.24*x
    y/=max(np.max(np.abs(y)),.001)
    stereo=np.column_stack([y,y])*.65
    for delay,gain in [(.13,.12),(.26,.055)]:
        d=int(delay*sr);stereo[d:,1]+=y[:-d]*gain
    save(name,stereo)
print('Rendered',len(list(OUT.glob('*.mp3'))),'audio assets')
