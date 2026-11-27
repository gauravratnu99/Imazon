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
import { Layers, Sun, Moon } from 'lucide-react';

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

      {/* Fixed Right-Side Theme Switcher Widget */}
      <div
        role="group"
        aria-label="Theme switcher"
        className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-1 p-1.5 rounded-l-2xl bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border border-r-0 border-neutral-200 dark:border-neutral-700 shadow-lg transition-colors duration-200"
      >
        <button
          type="button"
          onClick={() => theme !== 'light' && handleToggleTheme()}
          aria-label="Light mode"
          aria-pressed={theme === 'light'}
          title="Light mode"
          className={`flex flex-col items-center justify-center w-10 py-2 rounded-xl text-[10px] font-semibold transition-all cursor-pointer ${
            theme === 'light'
              ? 'bg-amber-100 text-amber-700 shadow-2xs ring-1 ring-amber-300/80'
              : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100'
          }`}
        >
          <Sun className="w-4 h-4 mb-0.5" />
          <span>Light</span>
        </button>

        <button
          type="button"
          onClick={() => theme !== 'dark' && handleToggleTheme()}
          aria-label="Dark mode"
          aria-pressed={theme === 'dark'}
          title="Dark mode"
          className={`flex flex-col items-center justify-center w-10 py-2 rounded-xl text-[10px] font-semibold transition-all cursor-pointer ${
            theme === 'dark'
              ? 'bg-neutral-800 text-amber-300 shadow-2xs ring-1 ring-neutral-600'
              : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
          }`}
        >
          <Moon className="w-4 h-4 mb-0.5" />
          <span>Dark</span>
        </button>
      </div>
    </div>
  );
}
