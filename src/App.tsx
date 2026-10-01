import React, { useState } from 'react';
import { Header } from './components/Header';
import { ToolsSuiteBar } from './components/ToolsSuiteBar';
import { CompressorApp } from './components/CompressorApp';
import { ResizeTool } from './components/ResizeTool';
import { ConvertTool } from './components/ConvertTool';
import { CompanionInfo } from './components/CompanionInfo';
import { ShieldCheck, Heart } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('compress');
  const [hasFiles, setHasFiles] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [resetFn, setResetFn] = useState<(() => void) | null>(null);
  const [zipFn, setZipFn] = useState<(() => void) | null>(null);

  const handleStateChange = (
    hasAnyFiles: boolean,
    completed: number,
    onReset: () => void,
    onZip: () => void
  ) => {
    setHasFiles(hasAnyFiles);
    setCompletedCount(completed);
    setResetFn(() => onReset);
    setZipFn(() => onZip);
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 text-neutral-900 selection:bg-rose-100 selection:text-rose-900">
      {/* Top Bar Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hasFiles={hasFiles}
        onReset={() => resetFn?.()}
        completedCount={completedCount}
        onDownloadAllZip={() => zipFn?.()}
      />

      {/* iLoveIMG Suite Strip */}
      <ToolsSuiteBar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {activeTab === 'compress' && (
          <CompressorApp onStateChange={handleStateChange} />
        )}
        {activeTab === 'resize' && <ResizeTool />}
        {activeTab === 'convert' && <ConvertTool />}
        {(activeTab === 'crop' || activeTab === 'editor' || activeTab === 'watermark') && (
          <CompanionInfo tool={activeTab} onGoToCompress={() => setActiveTab('compress')} />
        )}
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-neutral-200 bg-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-neutral-800">Imazon</span>
            <span aria-hidden="true">·</span>
            <span>Online Image Optimization & Compression Suite</span>
          </div>

          <div className="flex items-center gap-1.5 text-neutral-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>100% Client-Side Privacy: files never leave your device</span>
          </div>

          <div className="text-neutral-400">
            © {new Date().getFullYear()} Imazon. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
