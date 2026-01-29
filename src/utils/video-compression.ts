import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export class VideoCompressionService {
  private static instance: FFmpeg | null = null;
  private static isLoading = false;

  private static async load() {
    if (this.instance) return this.instance;

    if (this.isLoading) {
      while (this.isLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (this.instance) return this.instance;
    }

    this.isLoading = true;
    const ffmpeg = new FFmpeg();

    try {
      // Using the default CDN (unpkg) for ffmpeg-core.
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      this.instance = ffmpeg;
    } catch (error) {
      console.error('Failed to load FFmpeg:', error);
      throw new Error('Video compression engine failed to load. Please try again or check browser compatibility.');
    } finally {
      this.isLoading = false;
    }

    return this.instance;
  }

  static async compressVideo(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<File> {
    const ffmpeg = await this.load();
    const inputName = 'input.mp4';
    const outputName = 'output.mp4';

    const progressHandler = ({ progress }: { progress: number, time: number }) => {
      if (onProgress) onProgress(Math.round(progress * 100));
    };

    try {
      // Setup progress handler
      ffmpeg.on('progress', progressHandler);

      // Write the file to memory
      await ffmpeg.writeFile(inputName, await fetchFile(file));

      // Run compression
      await ffmpeg.exec([
        '-i', inputName,
        '-vf', 'scale=-2:720',
        '-c:v', 'libx264',
        '-crf', '28',
        '-preset', 'ultrafast',
        '-c:a', 'aac',
        outputName
      ]);

      // Read the result
      const data = await ffmpeg.readFile(outputName);

      // Convert to File
      const blob = new Blob([data], { type: 'video/mp4' });
      const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + "_compressed.mp4", {
        type: 'video/mp4',
        lastModified: Date.now(),
      });

      return compressedFile;

    } catch (error) {
      console.error('Compression error:', error);
      throw new Error('Video compression failed.');
    } finally {
      // Cleanup
      ffmpeg.off('progress', progressHandler);
      try {
        await ffmpeg.deleteFile(inputName);
        await ffmpeg.deleteFile(outputName);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
}
