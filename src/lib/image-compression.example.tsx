import React, { useState } from 'react';
import { resizeImage } from './image-compression';

/**
 * Example usage of the resizeImage utility.
 *
 * Usage:
 * 1. Import resizeImage from './image-compression'
 * 2. Invoke it with a File object (e.g. from an input change event)
 * 3. Handle the returned Promise to get the compressed File
 */

export const ImageCompressionExample = () => {
  const [originalSize, setOriginalSize] = useState<string>('');
  const [compressedSize, setCompressedSize] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset state
    setError(null);
    setOriginalSize(`${(file.size / 1024 / 1024).toFixed(2)} MB`);
    setCompressedSize('');
    setIsProcessing(true);

    try {
      // ---------------------------------------------------------
      // Call the utility function
      // You can override defaults: resizeImage(file, 1920, 1080, 0.8)
      // ---------------------------------------------------------
      const compressedFile = await resizeImage(file);

      setCompressedSize(`${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
      console.log('Compressed file:', compressedFile);
    } catch (err) {
      console.error(err);
      setError('Failed to compress image');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-4 border rounded shadow-sm">
      <h3 className="text-lg font-bold mb-4">Image Compression Test</h3>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Upload Image</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="block w-full text-sm text-slate-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-violet-50 file:text-violet-700
            hover:file:bg-violet-100"
        />
      </div>

      {isProcessing && <p className="text-blue-500">Processing...</p>}
      {error && <p className="text-red-500">{error}</p>}

      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="p-3 bg-gray-50 rounded">
          <p className="text-xs text-gray-500 uppercase">Original Size</p>
          <p className="font-mono">{originalSize || '-'}</p>
        </div>
        <div className="p-3 bg-green-50 rounded">
          <p className="text-xs text-green-600 uppercase">Compressed Size</p>
          <p className="font-mono">{compressedSize || '-'}</p>
        </div>
      </div>
    </div>
  );
};
