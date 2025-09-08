import React, { useState, useCallback } from 'react';
import { UploadIcon } from './icons';

interface ImageUploaderProps {
  onImageSelect: (file: File, base64: string) => void;
  onAnalyze: () => void;
  isLoading: boolean;
}

const ProgressBar: React.FC = () => (
    <div className="w-full bg-blue-200 rounded-full h-8 relative overflow-hidden">
        <div className="bg-blue-600 h-8 rounded-full animate-indeterminate-progress"></div>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
            Analyzing...
        </span>
    </div>
);


const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelect, onAnalyze, isLoading }) => {
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPreview(base64String);
        onImageSelect(file, base64String);
      };
      reader.readAsDataURL(file);
    }
  }, [onImageSelect]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200">
      <h2 className="text-xl font-semibold text-slate-700 mb-4">1. Upload Workplace Photo</h2>
      <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center bg-slate-50">
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
          disabled={isLoading}
        />
        {!preview && (
          <label htmlFor="file-upload" className="cursor-pointer">
            <div className="flex flex-col items-center text-slate-500">
              <UploadIcon className="w-12 h-12 mb-2" />
              <span>Click to browse or drag & drop</span>
              <span className="text-sm">PNG, JPG, WEBP</span>
            </div>
          </label>
        )}
        {preview && (
          <div className="relative group">
            <img src={preview} alt="Workplace preview" className="mx-auto max-h-64 rounded-md" />
            <label htmlFor="file-upload" className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              Change Image
            </label>
          </div>
        )}
      </div>
      {preview && (
        <div className="mt-6">
          {isLoading ? (
            <ProgressBar />
          ) : (
            <button
              onClick={onAnalyze}
              className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Analyze Image for Hazards
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageUploader;