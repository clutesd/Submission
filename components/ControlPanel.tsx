import React from 'react';
import ImageUploader from './ImageUploader';
import ActionButtons from './ActionButtons';
import { SafetyAnalysis } from '../types';

interface ControlPanelProps {
  onImageSelect: (file: File, base64: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  analysis: SafetyAnalysis | null;
  onGenerateSafeVersion: () => void;
  onGenerateChecklist: () => void;
  isLoadingSafeImage: boolean;
  isLoadingChecklist: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  onImageSelect,
  onAnalyze,
  isAnalyzing,
  analysis,
  onGenerateSafeVersion,
  onGenerateChecklist,
  isLoadingSafeImage,
  isLoadingChecklist,
}) => {
  return (
    <div className="flex flex-col gap-6 h-full">
      <ImageUploader 
        onImageSelect={onImageSelect} 
        onAnalyze={onAnalyze} 
        isLoading={isAnalyzing} 
      />
      {analysis && (
        <ActionButtons 
          onGenerateSafeVersion={onGenerateSafeVersion}
          onGenerateChecklist={onGenerateChecklist}
          isLoadingSafeImage={isLoadingSafeImage}
          isLoadingChecklist={isLoadingChecklist}
        />
      )}
    </div>
  );
};

export default ControlPanel;