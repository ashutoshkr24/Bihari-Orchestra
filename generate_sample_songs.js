const fs = require('fs');
const path = require('path');

function createWav(filename, title, bpm, scaleNotes) {
  const sampleRate = 44100;
  const durationSec = 30; // 30 sec sample loop
  const totalSamples = sampleRate * durationSec;
  const numChannels = 1;
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = totalSamples * blockAlign;

  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF Header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  const secondsPerBeat = 60 / bpm;
  const beatSamples = Math.floor(sampleRate * secondsPerBeat);

  let offset = 44;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const beatIndex = Math.floor(i / (beatSamples / 2));
    const currentNoteFreq = scaleNotes[beatIndex % scaleNotes.length];
    
    // Harmonium style tone: fundamental + rich 2nd and 3rd harmonics + subtle vibrato
    const vibrato = Math.sin(2 * Math.PI * 5 * t) * 2;
    const freq = currentNoteFreq + vibrato;
    const harm1 = Math.sin(2 * Math.PI * freq * t);
    const harm2 = 0.5 * Math.sin(2 * Math.PI * freq * 2 * t);
    const harm3 = 0.25 * Math.sin(2 * Math.PI * freq * 3 * t);
    const melody = (harm1 + harm2 + harm3) * 0.45;

    // Dholak rhythm (bass punch on beat 0, slap on beat 2)
    const beatPos = (i % beatSamples) / sampleRate;
    let dholak = 0;
    if (beatPos < 0.2) {
      // Deep bass strike
      const decay = Math.exp(-beatPos * 18);
      dholak = Math.sin(2 * Math.PI * (120 - beatPos * 200) * beatPos) * decay * 0.6;
    }
    const slapPos = ((i + beatSamples / 2) % beatSamples) / sampleRate;
    if (slapPos < 0.1) {
      // High snap
      const snapDecay = Math.exp(-slapPos * 40);
      dholak += Math.sin(2 * Math.PI * 480 * slapPos) * snapDecay * 0.35;
    }

    const mixed = Math.max(-1, Math.min(1, melody + dholak));
    const sampleVal = Math.floor(mixed * 30000);
    buffer.writeInt16LE(sampleVal, offset);
    offset += 2;
  }

  for (const dir of ['C:/Users/lenovo/bihari/songs', 'F:/post-today/bihari/songs']) {
    fs.writeFileSync(path.join(dir, filename), buffer);
  }
  console.log(`Generated ${filename}`);
}

// 1. Pawan Singh - Lollipop Lagelu (Folk Stage Tempo)
createWav('01_Pawan_Singh_-_Lollipop_Lagelu.wav', 'Lollipop Lagelu', 132, [293.66, 329.63, 369.99, 440.00, 493.88, 440.00, 369.99, 329.63]);

// 2. Bhikhari Thakur - Bidesiya (Soulful Folk Melancholy)
createWav('02_Bhikhari_Thakur_-_Bidesiya_Lokgeet.wav', 'Bidesiya Lokgeet', 96, [261.63, 293.66, 329.63, 392.00, 440.00, 392.00, 329.63, 293.66]);

// 3. Manoj Tiwari - Rinkiya Ke Papa (Bhojpuri Desi Beat)
createWav('03_Manoj_Tiwari_-_Rinkiya_Ke_Papa.wav', 'Rinkiya Ke Papa', 128, [329.63, 369.99, 392.00, 440.00, 493.88, 440.00, 392.00, 369.99]);

// 4. Sharda Sinha - Piya Ke Gaon (Classic Nostalgia)
createWav('04_Sharda_Sinha_-_Piya_Ke_Gaon.wav', 'Piya Ke Gaon', 104, [261.63, 311.13, 349.23, 392.00, 466.16, 392.00, 349.23, 311.13]);
