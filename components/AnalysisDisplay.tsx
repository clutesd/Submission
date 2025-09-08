import React from 'react';
import { SafetyAnalysis, Hazard, RiskLevel, Region } from '../types';
import { DownloadIcon, PrinterIcon, ZapIcon } from './icons';

interface AnalysisDisplayProps {
  analysis: SafetyAnalysis | null;
  isLoading: boolean;
  selectedHazardId: string | null;
  onHazardSelect: (id: string) => void;
  onHazardHover: (id: string | null) => void;
  onTargetedFix: (hazard: Hazard) => void;
  onDownloadJson: () => void;
  onGeneratePdf: () => void;
}

const RiskBadge: React.FC<{ level: RiskLevel }> = ({ level }) => {
  const levelStyles = {
    HIGH: 'bg-red-500 border-red-700',
    MEDIUM: 'bg-yellow-500 border-yellow-700',
    LOW: 'bg-green-500 border-green-700',
  };
  return <span className={`px-2 py-0.5 text-xs font-bold text-white rounded-full border-b-2 ${levelStyles[level]}`}>{level}</span>;
};

const HazardCard: React.FC<{ 
    hazard: Hazard, 
    isSelected: boolean,
    hasRegion: boolean,
    onSelect: (id: string) => void,
    onHover: (id: string | null) => void,
    onTargetedFix: (hazard: Hazard) => void,
    isLoading: boolean,
}> = ({ hazard, isSelected, hasRegion, onSelect, onHover, onTargetedFix, isLoading }) => {
    
    return (
        <div 
          className={`border rounded-lg transition-all duration-200 ${isSelected ? 'bg-blue-50 border-blue-400 shadow-lg' : 'bg-white border-slate-200'}`}
          onMouseEnter={() => onHover(hazard.id)}
          onMouseLeave={() => onHover(null)}
          onClick={() => onSelect(hazard.id)}
        >
            <div className="p-3 cursor-pointer">
                <div className="flex justify-between items-start">
                    <p className="font-semibold text-slate-800 pr-2"><span className="text-blue-600 font-bold">{hazard.id}:</span> {hazard.hazard}</p>
                    <RiskBadge level={hazard.risk.severity} />
                </div>
            </div>
            {isSelected && (
                 <div className="px-3 pb-3 border-t border-slate-200">
                    <div className="text-sm text-slate-600 mt-2">
                        <p><strong>Likelihood:</strong> <RiskBadge level={hazard.risk.likelihood} /></p>
                        <p className="mt-1"><em>{hazard.risk.reason}</em></p>
                        <h4 className="font-semibold mt-3 mb-1 text-slate-700">Recommended Controls:</h4>
                        <ul className="list-disc pl-5 space-y-1">
                            {hazard.decide_controls.map((control, i) => <li key={i}>{control}</li>)}
                        </ul>
                    </div>
                    <button
                      onClick={() => onTargetedFix(hazard)}
                      disabled={isLoading || !hasRegion}
                      title={!hasRegion ? "Location data not available for this hazard." : "Apply a targeted fix to this hazard."}
                      className="mt-4 w-full bg-indigo-600 text-white font-bold py-2 px-3 rounded-lg hover:bg-indigo-700 disabled:bg-slate-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors text-sm"
                    >
                      <ZapIcon className="w-4 h-4 mr-2" />
                      Apply Targeted Fix
                    </button>
                 </div>
            )}
        </div>
    );
}


const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({
  analysis,
  isLoading,
  selectedHazardId,
  onHazardSelect,
  onHazardHover,
  onTargetedFix,
  onDownloadJson,
  onGeneratePdf,
}) => {
    if (isLoading && !analysis) {
        return (
             <div className="bg-white p-4 rounded-lg shadow-lg border border-slate-200 flex flex-col h-full">
                <div className="flex-grow flex items-center justify-center text-center">
                    <div>
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-500 mx-auto"></div>
                        <p className="mt-2 text-slate-500">Analyzing image...</p>
                    </div>
                </div>
            </div>
        );
    }
    
    if (!analysis) {
        return (
            <div className="bg-white p-4 rounded-lg shadow-lg border border-slate-200 flex flex-col h-full">
                <div className="flex-grow flex items-center justify-center text-center text-slate-500">
                    <p>Analysis results will appear here once an image is processed.</p>
                </div>
            </div>
        );
    }

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg border border-slate-200 flex flex-col h-full max-h-[calc(100vh-6rem)]">
        <h2 className="text-xl font-bold text-slate-800 mb-1 border-b-2 border-slate-200 pb-2">Safety Analysis</h2>
        
        <div className="flex items-center justify-between mt-2">
            <h3 className="text-md font-semibold text-slate-600">Overall Risk:</h3>
            <RiskBadge level={analysis.overall_risk} />
        </div>

        <p className="text-sm text-slate-500 mt-2 italic">"{analysis.caption}"</p>

        <div className="flex items-center gap-2 mt-4">
             <button onClick={onGeneratePdf} className="flex-1 bg-gray-600 text-white font-semibold py-2 px-3 rounded-lg hover:bg-gray-700 disabled:bg-slate-400 flex items-center justify-center transition-colors text-sm">
                <PrinterIcon className="w-4 h-4 mr-2" />
                PDF Report
             </button>
             <button onClick={onDownloadJson} className="flex-1 bg-gray-600 text-white font-semibold py-2 px-3 rounded-lg hover:bg-gray-700 disabled:bg-slate-400 flex items-center justify-center transition-colors text-sm">
                <DownloadIcon className="w-4 h-4 mr-2" />
                JSON
            </button>
        </div>

        <h3 className="text-md font-semibold text-slate-700 mt-4 pt-3 border-t border-slate-200">Identified Hazards ({analysis.hazards.length})</h3>
        
        <div className="mt-2 space-y-2 overflow-y-auto pr-2 flex-grow">
            {analysis.hazards.map(hazard => {
                const hasRegion = !!analysis.regions.find(r => r.id === hazard.id);
                return (
                    <HazardCard 
                        key={hazard.id}
                        hazard={hazard}
                        isSelected={selectedHazardId === hazard.id}
                        hasRegion={hasRegion}
                        onSelect={onHazardSelect}
                        onHover={onHazardHover}
                        onTargetedFix={onTargetedFix}
                        isLoading={isLoading}
                    />
                );
            })}
        </div>
    </div>
  );
};

export default AnalysisDisplay;