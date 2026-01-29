import { useState } from 'react';
import { VideoCompressionService } from '@/utils/video-compression';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function VideoCompressionTest() {
  const [file, setFile] = useState<File | null>(null);
  const [compressedFile, setCompressedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setCompressedFile(null);
      setError(null);
      setProgress(0);
    }
  };

  const handleCompress = async () => {
    if (!file) return;
    setIsCompressing(true);
    setError(null);
    try {
      const result = await VideoCompressionService.compressVideo(file, (p) => {
        // Progress can sometimes be weird (NaN or >100 or <0), clamp it
        const cleanP = Math.max(0, Math.min(100, p));
        setProgress(cleanP);
      });
      setCompressedFile(result);
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message || 'Compression failed. Ensure you are using a browser that supports SharedArrayBuffer (Chrome/Firefox Desktop) or checking console for COOP/COEP errors.');
      } else {
        setError('Compression failed. Ensure you are using a browser that supports SharedArrayBuffer (Chrome/Firefox Desktop) or checking console for COOP/COEP errors.');
      }
    } finally {
      setIsCompressing(false);
    }
  };

  const formatSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="container mx-auto p-4 space-y-4 max-w-2xl mt-10">
      <Card>
        <CardHeader><CardTitle>Video Compression Utility Test</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select a Video (MP4/MOV/etc)</label>
            <Input type="file" accept="video/*" onChange={handleFileChange} />
          </div>

          {file && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Original Size: {formatSize(file.size)}</p>
              <Button onClick={handleCompress} disabled={isCompressing} className="w-full">
                {isCompressing ? 'Compressing...' : 'Compress Video'}
              </Button>
            </div>
          )}

          {isCompressing && (
             <div className="space-y-1">
                <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                   <div className="bg-primary h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
                <p className="text-center text-xs text-muted-foreground">{progress}%</p>
             </div>
          )}

          {error && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                {error}
            </div>
          )}

          {compressedFile && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-bold">Result</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                 <div>
                    <span className="font-semibold">Original:</span> {formatSize(file?.size || 0)}
                 </div>
                 <div>
                    <span className="font-semibold">Compressed:</span> {formatSize(compressedFile.size)}
                 </div>
              </div>
              <p className="text-sm text-green-600 font-medium">
                Reduction: {((1 - compressedFile.size / (file?.size || 1)) * 100).toFixed(1)}%
              </p>

              <video
                src={URL.createObjectURL(compressedFile)}
                controls
                className="w-full rounded-md bg-black/5"
              />

              <Button variant="outline" asChild className="w-full">
                <a
                    href={URL.createObjectURL(compressedFile)}
                    download={compressedFile.name}
                >
                    Download Compressed File
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
