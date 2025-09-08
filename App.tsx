import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import ControlPanel from './components/ControlPanel';
import ImageDisplay from './components/ImageDisplay';
import AnalysisDisplay from './components/AnalysisDisplay';
import GeneratedImageViewer from './components/GeneratedImageViewer';
import { ErrorDisplay } from './components/ErrorDisplay';
import { SafetyAnalysis, Hazard }  from './types';
import { analyzeImage, applyTargetedFix, generateSafeImage, generateChecklist } from './services/geminiService';
import { downloadJson, generatePdf, createMaskFromRegion } from './utils';

type ViewMode = 'regions' | 'heatmap';

function App() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [workingImageBase64, setWorkingImageBase64] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<SafetyAnalysis | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingSafeImage, setIsLoadingSafeImage] = useState(false);
  const [isApplyingTargetedFix, setIsApplyingTargetedFix] = useState(false);
  const [isLoadingChecklist, setIsLoadingChecklist] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedHazardId, setSelectedHazardId] = useState<string | null>(null);
  const [hoveredHazardId, setHoveredHazardId] = useState<string | null>(null);

  const [safeVersionImageUrl, setSafeVersionImageUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('regions');

  const clearState = () => {
    setAnalysis(null);
    setError(null);
    setSelectedHazardId(null);
    setHoveredHazardId(null);
    setSafeVersionImageUrl(null);
  };

  const handleImageSelect = useCallback((file: File, base64: string) => {
    setImageFile(file);
    setImageBase64(base64);
    setWorkingImageBase64(base64);
    clearState();
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!imageFile || !workingImageBase64) {
      setError("Please select an image first.");
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    clearState();

    try {
      const result = await analyzeImage(workingImageBase64, imageFile.type);
      setAnalysis(result);
    } catch (e: any) {
      setError(e.message || "An unknown error occurred during analysis.");
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  }, [imageFile, workingImageBase64]);
  
  const handleTargetedFix = useCallback(async (hazard: Hazard) => {
    if (!analysis || !workingImageBase64 || !imageFile) return;
    
    const region = analysis.regions.find(r => r.id === hazard.id);
    if (!region) {
        setError(`Could not find region for hazard ${hazard.id}. The button should have been disabled.`);
        return;
    }

    setIsApplyingTargetedFix(true);
    setError(null);

    const img = new Image();
    img.onload = async () => {
        try {
            const mask = createMaskFromRegion(region, img.naturalWidth, img.naturalHeight);
            const fixedImage = await applyTargetedFix(workingImageBase64, imageFile.type, mask, hazard);
            setWorkingImageBase64(fixedImage);
        } catch (e: any) {
            setError(e.message || "Failed to apply targeted fix.");
            console.error(e);
        } finally {
            setIsApplyingTargetedFix(false);
        }
    };
    img.onerror = () => {
        setError("Could not load image to create mask.");
        setIsApplyingTargetedFix(false);
    }
    img.src = workingImageBase64;
  }, [analysis, workingImageBase64, imageFile]);

  const handleGenerateSafeVersion = useCallback(async () => {
    if (!analysis || !workingImageBase64 || !imageFile) return;
    setIsLoadingSafeImage(true);
    setSafeVersionImageUrl(null);
    setError(null);
    try {
      const safeImage = await generateSafeImage(workingImageBase64, imageFile.type, analysis);
      setSafeVersionImageUrl(safeImage);
    } catch (e: any) {
      setError(e.message || "Failed to generate safe version.");
      console.error(e);
    } finally {
      setIsLoadingSafeImage(false);
    }
  }, [analysis, workingImageBase64, imageFile]);
  
  const handleGenerateChecklist = useCallback(async () => {
    if (!analysis) return;
    setIsLoadingChecklist(true);
    setError(null);
    try {
      const checklist = await generateChecklist(analysis);
      const checklistWindow = window.open('', 'Checklist', 'width=800,height=600,scrollbars=yes,resizable=yes');
      if (checklistWindow) {
        checklistWindow.document.write('<html><head><title>Safety Checklist</title><style>body { font-family: monospace; white-space: pre-wrap; word-wrap: break-word; }</style></head><body>');
        checklistWindow.document.write(checklist.replace(/</g, "&lt;").replace(/>/g, "&gt;"));
        checklistWindow.document.write('</body></html>');
        checklistWindow.document.close();
      } else {
        alert('Could not open checklist. Please disable popup blockers for this site.');
      }
    } catch (e: any) {
      setError(e.message || "Failed to generate checklist.");
      console.error(e);
    } finally {
      setIsLoadingChecklist(false);
    }
  }, [analysis]);
  
  const handleDownloadJson = useCallback(() => {
    if (!analysis) return;
    downloadJson(analysis, `safety-analysis-${imageFile?.name || 'report'}.json`);
  }, [analysis, imageFile]);

  const handleGeneratePdf = useCallback(() => {
    if (!analysis || !imageBase64) return;
    generatePdf(analysis, imageBase64);
  }, [analysis, imageBase64]);

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans">
      <Header />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-6 overflow-hidden">
        <div className="h-full flex flex-col gap-6">
          <ErrorDisplay message={error} onClose={() => setError(null)} />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow min-h-0">
            {/* Left Column */}
            <div className="lg:col-span-3 h-full">
              <ControlPanel
                onImageSelect={handleImageSelect}
                onAnalyze={handleAnalyze}
                isAnalyzing={isAnalyzing || isApplyingTargetedFix}
                analysis={analysis}
                onGenerateSafeVersion={handleGenerateSafeVersion}
                onGenerateChecklist={handleGenerateChecklist}
                isLoadingSafeImage={isLoadingSafeImage}
                isLoadingChecklist={isLoadingChecklist}
              />
            </div>

            {/* Center Column */}
            <div className="lg:col-span-6 flex flex-col gap-6 h-full min-h-0">
                <div className="flex-grow min-h-0">
                  <ImageDisplay
                      imageSrc={workingImageBase64}
                      analysis={analysis}
                      selectedHazardId={selectedHazardId}
                      hoveredHazardId={hoveredHazardId}
                      onHazardHover={setHoveredHazardId}
                      onHazardSelect={setSelectedHazardId}
                      viewMode={viewMode}
                      onSetViewMode={setViewMode}
                  />
                </div>
                <div className="flex flex-col gap-6">
                  <GeneratedImageViewer
                      title="Generated Safe Version"
                      imageUrl={safeVersionImageUrl}
                      isLoading={isLoadingSafeImage}
                  />
                </div>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-3 h-full min-h-0">
              <AnalysisDisplay
                  analysis={analysis}
                  isLoading={isAnalyzing || isApplyingTargetedFix}
                  selectedHazardId={selectedHazardId}
                  onHazardSelect={setSelectedHazardId}
                  onHazardHover={setHoveredHazardId}
                  onTargetedFix={handleTargetedFix}
                  onDownloadJson={handleDownloadJson}
                  onGeneratePdf={handleGeneratePdf}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;