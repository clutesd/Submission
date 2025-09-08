import React from 'react';
import { ShieldCheckIcon } from './icons';

export const Header: React.FC = () => {
  return (
    <header className="bg-slate-800 shadow-lg border-b-4 border-yellow-400">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-3">
        <ShieldCheckIcon className="w-10 h-10 text-blue-500" />
        <div>
            <h1 className="text-2xl font-bold text-slate-100">Safety Hazard Mapper v2</h1>
            <p className="text-sm text-slate-300">Interactive Workplace Safety Analysis</p>
        </div>
      </div>
    </header>
  );
};