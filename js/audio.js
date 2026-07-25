/* js/audio.js */

class AmbientAudioEngine {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.volume = 0.5;

    // Generative Nodes
    this.masterGain = null;
    this.rainGain = null;
    this.pianoGain = null;
    this.delayNode = null;
    this.delayFeedback = null;

    // Playback loop interval
    this.sequenceInterval = null;
    this.currentChordIndex = 0;

    // Chord progression (soft extensions: Maj9, m9, 6/9 chords)
    this.chords = [
      [87.31, 174.61, 261.63, 329.63, 392.00, 440.00],  // Fmaj9
      [98.00, 196.00, 246.94, 293.66, 329.63, 440.00],  // G6/9
      [65.41, 130.81, 196.00, 246.94, 293.66, 329.63],  // Cmaj9
      [110.00, 220.00, 261.63, 329.63, 392.00, 493.88], // Am9
      [73.42, 146.83, 220.00, 261.63, 329.63, 349.23],  // Dm9
      [58.27, 116.54, 174.61, 220.00, 293.66, 369.99]   // Bbmaj7(#11)
    ];
  }

  init() {
    if (this.ctx) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return; // Web Audio unsupported — fail silently, rest of site still works
    this.ctx = new AudioContextClass();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime); // start silent, fade in on toggle
    this.masterGain.connect(this.ctx.destination);

    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.setValueAtTime(0.04, this.ctx.currentTime);
    this.rainGain.connect(this.masterGain);

    this.pianoGain = this.ctx.createGain();
    this.pianoGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    this.pianoGain.connect(this.masterGain);

    this.delayNode = this.ctx.createDelay(2.0);
    this.delayNode.delayTime.setValueAtTime(0.6, this.ctx.currentTime);

    this.delayFeedback = this.ctx.createGain();
    this.delayFeedback.gain.setValueAtTime(0.4, this.ctx.currentTime);

    this.pianoGain.connect(this.delayNode);
    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    this.delayNode.connect(this.masterGain);

    this.buildRainNode();
  }

  buildRainNode() {
    const bufferSize = 4 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(650, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.0, this.ctx.currentTime);

    const lfo = this.ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.08, this.ctx.currentTime);

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(150, this.ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    noiseSource.connect(filter);
    filter.connect(this.rainGain);

    lfo.start(0);
    noiseSource.start(0);
  }

  playPianoNote(freq, time, velocity = 0.5) {
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const noteGain = this.ctx.createGain();
    const noteFilter = this.ctx.createBiquadFilter();

    osc1.type = 'triangle';
    osc2.type = 'sine';

    osc1.frequency.setValueAtTime(freq, time);
    osc2.frequency.setValueAtTime(freq * 1.002, time);

    noteFilter.type = 'lowpass';
    noteFilter.frequency.setValueAtTime(900, time);
    noteFilter.frequency.exponentialRampToValueAtTime(350, time + 2.5);

    noteGain.gain.setValueAtTime(0, time);
    noteGain.gain.linearRampToValueAtTime(velocity * 0.15, time + 0.04);
    noteGain.gain.exponentialRampToValueAtTime(velocity * 0.05, time + 1.2);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, time + 4.5);

    osc1.connect(noteFilter);
    osc2.connect(noteFilter);
    noteFilter.connect(noteGain);
    noteGain.connect(this.pianoGain);

    osc1.start(time);
    osc2.start(time);

    osc1.stop(time + 5.0);
    osc2.stop(time + 5.0);
  }

  playChord(chordNotes, velocity = 0.6) {
    const now = this.ctx.currentTime;

    chordNotes.forEach((freq, idx) => {
      const delay = idx * (0.04 + Math.random() * 0.05);
      const noteVel = velocity * (0.7 + Math.random() * 0.3);
      this.playPianoNote(freq, now + delay, noteVel);
    });
  }

  playStarChime() {
    if (!this.ctx || this.ctx.state === 'suspended') return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];
    const randomFreq = notes[Math.floor(Math.random() * notes.length)];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const delay = this.ctx.createDelay();
    const feedback = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(randomFreq, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.06, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);

    delay.delayTime.setValueAtTime(0.3, now);
    feedback.gain.setValueAtTime(0.5, now);

    osc.connect(gain);
    gain.connect(this.masterGain);

    gain.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 2.5);
  }

  startGenerativeLoop() {
    this.stopGenerativeLoop();

    this.playChord(this.chords[this.currentChordIndex]);
    this.currentChordIndex = (this.currentChordIndex + 1) % this.chords.length;

    this.sequenceInterval = setInterval(() => {
      if (this.ctx && this.ctx.state !== 'suspended') {
        const chord = this.chords[this.currentChordIndex];
        const chordVel = 0.55 + Math.random() * 0.15;
        this.playChord(chord, chordVel);

        setTimeout(() => {
          if (this.isPlaying && Math.random() > 0.4) {
            this.playStarChime();
          }
        }, 3000);

        this.currentChordIndex = (this.currentChordIndex + 1) % this.chords.length;
      }
    }, 7500);
  }

  stopGenerativeLoop() {
    if (this.sequenceInterval) {
      clearInterval(this.sequenceInterval);
      this.sequenceInterval = null;
    }
  }

  toggle() {
    this.init();
    if (!this.ctx) return this.isPlaying; // Web Audio unsupported

    const now = this.ctx.currentTime;

    if (this.isPlaying) {
      // Fade out smoothly, then suspend
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.8);
      this.isPlaying = false;
      this.stopGenerativeLoop();
      document.body.classList.remove('music-playing');
      setTimeout(() => {
        if (!this.isPlaying && this.ctx && this.ctx.state === 'running') this.ctx.suspend();
      }, 850);
    } else {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(0.0001, now);
      this.masterGain.gain.linearRampToValueAtTime(this.volume, now + 1.2);
      this.isPlaying = true;
      this.startGenerativeLoop();
      document.body.classList.add('music-playing');
    }

    return this.isPlaying;
  }

  setVolume(val) {
    this.volume = val;
    if (this.masterGain && this.ctx && this.isPlaying) {
      this.masterGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.05);
    }
  }
}

// Global Audio Engine Instance
const audioEngine = new AmbientAudioEngine();
window.audioEngine = audioEngine;
