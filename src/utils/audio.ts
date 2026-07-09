/**
 * Audio helpers for managing Gemini TTS raw 16-bit PCM audio (24kHz)
 */

export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Creates a standard Web Audio API AudioBuffer from raw PCM Base64 data
 */
export function createAudioBufferFromPcm(
  base64: string,
  ctx: AudioContext,
  sampleRate: number = 24000
): AudioBuffer {
  const pcmBytes = base64ToUint8Array(base64);
  const numSamples = pcmBytes.length / 2; // 16-bit PCM is 2 bytes per sample
  const floatSamples = new Float32Array(numSamples);
  
  const dataView = new DataView(pcmBytes.buffer, pcmBytes.byteOffset, pcmBytes.byteLength);
  
  for (let i = 0; i < numSamples; i++) {
    // 16-bit Signed Integer, Little Endian
    const intSample = dataView.getInt16(i * 2, true);
    // Convert to float between -1.0 and 1.0
    floatSamples[i] = intSample / 32768.0;
  }
  
  const audioBuffer = ctx.createBuffer(1, numSamples, sampleRate);
  audioBuffer.copyToChannel(floatSamples, 0);
  return audioBuffer;
}

/**
 * Stitch multiple Base64 raw PCM chunks together into a single downloadable WAV Blob
 */
export function pcmChunksToWavBlob(
  chunksBase64: string[],
  sampleRate: number = 24000
): Blob {
  const decodedChunks = chunksBase64.map((chunk) => base64ToUint8Array(chunk));
  
  // Join all Uint8Array chunks together
  let totalLength = 0;
  for (const chunk of decodedChunks) {
    totalLength += chunk.length;
  }
  
  const pcmBytes = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of decodedChunks) {
    pcmBytes.set(chunk, offset);
    offset += chunk.length;
  }

  // Build standard 44-byte WAV header
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  // "RIFF" chunk descriptor
  writeString(view, 0, "RIFF");
  // File length minus RIFF header length (36 + actual PCM data size)
  view.setUint32(4, 36 + pcmBytes.length, true);
  // "WAVE" format
  writeString(view, 8, "WAVE");
  // "fmt " sub-chunk
  writeString(view, 12, "fmt ");
  // Sub-chunk size (16 for PCM)
  view.setUint32(16, 16, true);
  // Audio format (1 for uncompressed linear PCM)
  view.setUint16(20, 1, true);
  // Channel count (1 for Mono)
  view.setUint16(22, 1, true);
  // Sample rate (24000 Hz)
  view.setUint32(24, sampleRate, true);
  // Byte rate (SampleRate * ChannelCount * BitsPerSample/8 = SampleRate * 2)
  view.setUint32(28, sampleRate * 2, true);
  // Block align (ChannelCount * BitsPerSample/8 = 2)
  view.setUint16(32, 2, true);
  // Bits per sample (16)
  view.setUint16(34, 16, true);
  // "data" sub-chunk
  writeString(view, 36, "data");
  // Data size
  view.setUint32(40, pcmBytes.length, true);

  // Combine header and PCM bytes into a standard playable WAV file
  return new Blob([wavHeader, pcmBytes], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}


