export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Risk {
  severity: RiskLevel;
  likelihood: RiskLevel;
  reason: string;
}

export interface Hazard {
  id: string;
  hazard: string;
  risk: Risk;
  decide_controls: string[];
}

export type ShapeType = 'rect' | 'poly';

export interface Region {
  id: string;
  shape: ShapeType;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  points?: number[][];
}

export interface SafetyAnalysis {
  caption: string;
  overall_risk: RiskLevel;
  hazards: Hazard[];
  regions: Region[];
  summary: string;
}