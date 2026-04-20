/**
 * Cartesia Web Audio Player logic.
 * Manages fetching `/api/tts` and playing PCM chunks sequentially.
 */

export class TTSPlayer {
  private audioContext: AudioContext | null = null;
  private queue: string[] = [];
  private isPlaying = false;
  private apiKey: string;
  private aborted = false;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  public enqueueSentence(text: string) {
    if (this.aborted) return;
    const clean = text.trim();
    if (!clean) return;
    
    this.queue.push(clean);
    this.processQueue();
  }

  public abort() {
    this.aborted = true;
    this.queue = [];
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.isPlaying = false;
  }

  private async processQueue() {
    if (this.isPlaying || this.queue.length === 0 || this.aborted) return;
    this.isPlaying = true;

    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || (window as unknown as Window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioContext = new AudioCtx({
          sampleRate: 44100
        });
      }

      while (this.queue.length > 0 && !this.aborted) {
        const sentence = this.queue.shift()!;
        await this.playSentence(sentence);
      }
    } catch (err) {
      console.error("TTS playback error:", err);
    } finally {
      this.isPlaying = false;
    }
  }

  private async playSentence(text: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, api_key: this.apiKey }),
        });

        if (!res.ok || this.aborted) return resolve();

        const buffer = await res.arrayBuffer();
        if (this.aborted) return resolve();

        const floatData = new Float32Array(buffer);
        const audioBuffer = this.audioContext!.createBuffer(1, floatData.length, 44100);
        audioBuffer.getChannelData(0).set(floatData);

        const source = this.audioContext!.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.audioContext!.destination);

        source.onended = () => resolve();
        source.start();
      } catch (err) {
        reject(err);
      }
    });
  }
}
