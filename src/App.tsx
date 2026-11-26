import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { ToolsSuiteBar } from './components/ToolsSuiteBar';
import { CompressorApp } from './components/CompressorApp';
import { ResizeTool } from './components/ResizeTool';
import { UpscaleTool } from './components/UpscaleTool';
import { TransparentTool } from './components/TransparentTool';
import { CropTool } from './components/CropTool';
import { WatermarkTool } from './components/WatermarkTool';
import { PhotoEditorTool } from './components/PhotoEditorTool';
import { ConvertTool } from './components/ConvertTool';
import { Layers } from 'lucide-react';

type ThemeMode = 'light' | 'dark';

export default function App() {
  const [activeTab, setActiveTab] = useState('compress');
  const [hasFiles, setHasFiles] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const resetFnRef = useRef<(() => void) | null>(null);
  const zipFnRef = useRef<(() => void) | null>(null);

  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('imazon-theme');
      if (saved === 'dark' || saved === 'light') return saved;
      if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
    } catch {
      // ignore storage errors
    }
    return 'light';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem('imazon-theme', theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const handleStateChange = useCallback(
    (
      hasAnyFiles: boolean,
      completed: number,
      onReset: () => void,
      onZip: () => void
    ) => {
      setHasFiles(hasAnyFiles);
      setCompletedCount(completed);
      resetFnRef.current = onReset;
      zipFnRef.current = onZip;
    },
    []
  );

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 selection:bg-rose-100 dark:selection:bg-rose-900/50 selection:text-rose-900 dark:selection:text-rose-100 transition-colors duration-200">
      {/* Top Bar Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hasFiles={activeTab === 'compress' && hasFiles}
        onReset={() => resetFnRef.current?.()}
        completedCount={activeTab === 'compress' ? completedCount : 0}
        onDownloadAllZip={() => zipFnRef.current?.()}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Unified Suite Bar with Compress, Resize, Upscale, Transparent, etc. */}
      <ToolsSuiteBar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {activeTab === 'compress' && (
          <CompressorApp onStateChange={handleStateChange} />
        )}
        {activeTab === 'resize' && <ResizeTool />}
        {activeTab === 'upscale' && <UpscaleTool />}
        {activeTab === 'transparent' && <TransparentTool />}
        {activeTab === 'crop' && <CropTool />}
        {activeTab === 'watermark' && <WatermarkTool />}
        {activeTab === 'convert' && <ConvertTool />}
        {activeTab === 'editor' && <PhotoEditorTool />}
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-8 mt-12 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 sm:grid-cols-3 items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center justify-center sm:justify-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-xs">
              <Layers className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span className="text-base font-extrabold tracking-tight text-red-600">
              Imazon
            </span>
          </div>

          <div className="text-center text-neutral-500 dark:text-neutral-400">
            © {new Date().getFullYear()} Imazon. All rights reserved.
          </div>

          <div className="hidden sm:block" aria-hidden="true" />
        </div>
      </footer>
    </div>
  );
}
