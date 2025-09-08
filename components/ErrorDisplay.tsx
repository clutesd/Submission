import React from 'react';
import { AlertTriangleIcon, XIcon } from './icons';

interface ErrorDisplayProps {
  message: string;
  onClose: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message, onClose }) => {
  if (!message) return null;
  return (
    <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4 relative" role="alert">
      <div className="flex">
        <div className="py-1">
          <AlertTriangleIcon className="h-6 w-6 text-red-400 mr-4" />
        </div>
        <div>
          <p className="font-bold text-red-800">Error</p>
          <p className="text-sm text-red-700">{message}</p>
        </div>
      </div>
      <button onClick={onClose} className="absolute top-2 right-2 p-1 rounded-full hover:bg-red-100">
        <XIcon className="h-5 w-5 text-red-600" />
      </button>
    </div>
  );
};
