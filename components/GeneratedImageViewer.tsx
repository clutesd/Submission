
import React from 'react';
import { Loader } from './Loader';

interface GeneratedImageViewerProps {
  title: string;
  imageUrl: string | null;
  isLoading: boolean;
}

const GeneratedImageViewer: React.FC<GeneratedImageViewerProps> = ({ title, imageUrl, isLoading }) => {
  if (!imageUrl && !isLoading) {
    return null;
  }
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-md border border-slate-200">
      <h3 className="text-md font-semibold text-slate-600 mb-3">{title}</h3>
      <div className="aspect-w-1 aspect-h-1 bg-slate-100 rounded-md flex items-center justify-center overflow-hidden">
        {isLoading && (
            <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-500 mx-auto"></div>
                <p className="mt-2 text-sm text-slate-500">Generating...</p>
            </div>
        )}
        {imageUrl && !isLoading && (
          <img src={imageUrl} alt={title} className="object-contain w-full h-full" />
        )}
      </div>
    </div>
  );
};

export default GeneratedImageViewer;
