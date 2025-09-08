
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SafetyAnalysis, Region, RiskLevel, Hazard } from '../types';
import { HeatmapIcon, ShapesIcon } from './icons';

type ViewMode = 'regions' | 'heatmap';

interface ImageDisplayProps {
  imageSrc: string | null;
  analysis: SafetyAnalysis | null;
  selectedHazardId: string | null;
  hoveredHazardId: string | null;
  onHazardHover: (id: string | null) => void;
  onHazardSelect: (id: string | null) => void;
  viewMode: ViewMode;
  onSetViewMode: (mode: ViewMode) => void;
}

type ImgMetrics = {
  naturalW: number; naturalH: number;
  drawW: number; drawH: number;
  offsetX: number; offsetY: number;
};

const getRiskColor = (risk: RiskLevel, opacity: number = 1): string => {
  const colors = {
    HIGH: `rgba(239, 68, 68, ${opacity})`, // red-500
    MEDIUM: `rgba(245, 158, 11, ${opacity})`, // amber-500
    LOW: `rgba(34, 197, 94, ${opacity})`, // green-500
  };
  return colors[risk] || `rgba(107, 114, 128, ${opacity})`; // gray-500
};

const heatRGB: Record<RiskLevel, [number, number, number]> = {
  HIGH:   [239,  68,  68],
  MEDIUM: [245, 158,  11],
  LOW:    [34, 197, 94],
};

const rgba = (rgb: [number, number, number], a: number) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;


const RegionShape: React.FC<{
    region: Region;
    hazard: Hazard | undefined;
    width: number;
    height: number;
    isSelected: boolean;
    isHovered: boolean;
    onHover: (id: string | null) => void;
    onSelect: (id: string | null) => void;
}> = ({ region, hazard, width, height, isSelected, isHovered, onHover, onSelect }) => {
    
    const riskSeverity = hazard?.risk?.severity ?? 'MEDIUM';
    const riskColor = getRiskColor(riskSeverity, 1);
    const hoverFillColor = getRiskColor(riskSeverity, 0.25);

    const commonProps = {
        className: `cursor-pointer transition-all duration-200`,
        style: { filter: 'drop-shadow(0px 1px 3px rgba(0,0,0,0.6))' },
        strokeWidth: isSelected ? 6 : (isHovered ? 4 : 2.5),
        stroke: isSelected ? 'rgb(59 130 246)' : riskColor, // Brighter blue-500 for selected
        fill: isHovered ? hoverFillColor : 'transparent',
        onMouseEnter: () => onHover(region.id),
        onMouseLeave: () => onHover(null),
        onClick: (e: React.MouseEvent) => {
            e.stopPropagation();
            onSelect(region.id);
        }
    };

    if (region.shape === 'rect' && region.x != null && region.y != null && region.w != null && region.h != null) {
        return (
            <rect
                x={region.x * width}
                y={region.y * height}
                width={region.w * width}
                height={region.h * height}
                {...commonProps}
            />
        );
    }

    if (region.shape === 'poly' && region.points) {
        const pointsStr = region.points.map(p => `${p[0] * width},${p[1] * height}`).join(' ');
        return <polygon points={pointsStr} {...commonProps} />;
    }

    return null;
}

const ImageDisplay: React.FC<ImageDisplayProps> = ({
  imageSrc,
  analysis,
  selectedHazardId,
  hoveredHazardId,
  onHazardHover,
  onHazardSelect,
  viewMode,
  onSetViewMode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [metrics, setMetrics] = useState<ImgMetrics>({
    naturalW: 0, naturalH: 0, drawW: 0, drawH: 0, offsetX: 0, offsetY: 0,
  });

  const computeMetrics = useCallback(() => {
    const el = containerRef.current;
    const img = imgRef.current;
    if (!el || !img || !img.naturalWidth || !img.naturalHeight) return;

    const { width: cw, height: ch } = el.getBoundingClientRect();
    const { naturalWidth, naturalHeight } = img;
    
    const sx = cw / naturalWidth;
    const sy = ch / naturalHeight;
    const scale = Math.min(sx, sy);
    const drawW = naturalWidth * scale;
    const drawH = naturalHeight * scale;
    const offsetX = (cw - drawW) / 2;
    const offsetY = (ch - drawH) / 2;
    setMetrics({ naturalW: naturalWidth, naturalH: naturalHeight, drawW, drawH, offsetX, offsetY });
  }, []);

  useEffect(() => {
    const ro = new ResizeObserver(computeMetrics);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [computeMetrics]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const onLoad = () => {
        requestAnimationFrame(computeMetrics);
    };
    img.addEventListener('load', onLoad);
    if (img.complete) {
        onLoad();
    }
    return () => img.removeEventListener('load', onLoad);
  }, [imageSrc, computeMetrics]);
  
  useEffect(() => {
    if (viewMode !== 'heatmap' || !analysis || !canvasRef.current || !metrics.drawW) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width  = Math.round(metrics.drawW * dpr);
    canvas.height = Math.round(metrics.drawH * dpr);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerOf = (r: Region) => {
        if (r.shape === 'rect' && r.x != null && r.y != null && r.w != null && r.h != null) {
          const x = (r.x + r.w / 2) * metrics.drawW;
          const y = (r.y + r.h / 2) * metrics.drawH;
          return { x, y };
        }
        if (r.shape === 'poly' && r.points?.length) {
          const xs = r.points.map(p => p[0] * metrics.drawW);
          const ys = r.points.map(p => p[1] * metrics.drawH);
          const minX = Math.min(...xs), maxX = Math.max(...xs);
          const minY = Math.min(...ys), maxY = Math.max(...ys);
          return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
        }
        return null;
    };

    analysis.hazards.forEach(hz => {
      const region = analysis.regions.find(r => r.id === hz.id);
      if (!region) return;
      const c = centerOf(region);
      if (!c) return;
  
      const rgb = heatRGB[hz.risk?.severity || 'MEDIUM'];
      const logicalRadius =
        hz.risk?.severity === 'HIGH' ? metrics.drawW * 0.25 :
        hz.risk?.severity === 'MEDIUM' ? metrics.drawW * 0.18 :
        metrics.drawW * 0.12;

      // Manually scale coordinates and radius for DPI to ensure perfect alignment
      const cx = c.x * dpr;
      const cy = c.y * dpr;
      const radius = logicalRadius * dpr;
  
      const g = ctx.createRadialGradient(cx, cy, radius * 0.05, cx, cy, radius);
      g.addColorStop(0.0, rgba(rgb, 0.8)); // Intense center
      g.addColorStop(1.0, rgba(rgb, 0.0));
  
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [viewMode, analysis, metrics]);


  return (
    <div className="bg-white p-4 rounded-lg shadow-lg border border-slate-200 h-full flex flex-col">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-bold text-slate-700">Image Analysis</h2>
        {analysis && (
          <div className="flex items-center bg-slate-100 p-1 rounded-md">
            <button
              onClick={() => onSetViewMode('regions')}
              className={`px-3 py-1 text-sm rounded-md flex items-center gap-1.5 ${viewMode === 'regions' ? 'bg-white text-blue-600 shadow' : 'text-slate-600 hover:bg-slate-200'} transition-all`}
              title="Region View"
            >
              <ShapesIcon className="w-4 h-4" /> Regions
            </button>
            <button
              onClick={() => onSetViewMode('heatmap')}
              className={`px-3 py-1 text-sm rounded-md flex items-center gap-1.5 ${viewMode === 'heatmap' ? 'bg-white text-blue-600 shadow' : 'text-slate-600 hover:bg-slate-200'} transition-all`}
              title="Heatmap View"
            >
              <HeatmapIcon className="w-4 h-4" /> Heatmap
            </button>
          </div>
        )}
      </div>

      <div className="flex-grow relative w-full h-full min-h-0" ref={containerRef}>
        {imageSrc ? (
          <>
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Workplace"
              className="object-contain w-full h-full"
            />
            {analysis && metrics.drawW > 0 && (
              <svg
                className={`absolute pointer-events-auto transition-opacity duration-300 ${viewMode === 'heatmap' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                style={{
                    top: metrics.offsetY,
                    left: metrics.offsetX,
                    width: metrics.drawW,
                    height: metrics.drawH,
                }}
                viewBox={`0 0 ${metrics.drawW} ${metrics.drawH}`}
                onClick={() => onHazardSelect(null)}
              >
                {analysis.regions.map(region => {
                  const hz = analysis.hazards.find(h => h.id === region.id);
                  return (
                    <RegionShape
                      key={region.id}
                      region={region}
                      hazard={hz}
                      width={metrics.drawW}
                      height={metrics.drawH}
                      isSelected={selectedHazardId === region.id}
                      isHovered={hoveredHazardId === region.id}
                      onHover={onHazardHover}
                      onSelect={onHazardSelect}
                    />
                  );
                })}
              </svg>
            )}
            <canvas
              ref={canvasRef}
              className={`absolute pointer-events-none filter blur-lg transition-opacity duration-300 ${viewMode === 'regions' ? 'opacity-0' : 'opacity-75'}`}
              style={{
                top: metrics.offsetY,
                left: metrics.offsetX,
                width: metrics.drawW,
                height: metrics.drawH,
              }}
            ></canvas>
          </>
        ) : (
          <div className="flex items-center justify-center h-full bg-slate-100 rounded-md">
            <p className="text-slate-500">Upload an image to begin analysis</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageDisplay;
