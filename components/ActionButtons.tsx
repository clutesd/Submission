
import React from 'react';
import { Loader } from './Loader';
import { ImageIcon, CheckListIcon } from './icons';

interface ActionButtonsProps {
  onGenerateSafeVersion: () => void;
  onGenerateChecklist: () => void;
  isLoadingSafeImage: boolean;
  isLoadingChecklist: boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  onGenerateSafeVersion,
  onGenerateChecklist,
  isLoadingSafeImage,
  isLoadingChecklist,
}) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200">
      <h2 className="text-xl font-semibold text-slate-700 mb-4">3. Optional Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={onGenerateSafeVersion}
          disabled={isLoadingSafeImage || isLoadingChecklist}
          className="bg-teal-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-700 disabled:bg-slate-400 flex items-center justify-center transition-colors"
        >
          {isLoadingSafeImage ? (
            <>
              <Loader />
              Generating...
            </>
          ) : (
            <>
              <ImageIcon className="w-5 h-5 mr-2"/>
              Generate Safe Version
            </>
          )}
        </button>
        <button
          onClick={onGenerateChecklist}
          disabled={isLoadingSafeImage || isLoadingChecklist}
          className="bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 disabled:bg-slate-400 flex items-center justify-center transition-colors"
        >
          {isLoadingChecklist ? (
            <>
              <Loader />
              Creating...
            </>
          ) : (
             <>
              <CheckListIcon className="w-5 h-5 mr-2"/>
              Generate Checklist
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ActionButtons;
