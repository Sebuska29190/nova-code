import { useAppStore } from "../stores/app";

export function TitleBar() {
  const { toggleSidebar } = useAppStore();

  return (
    <div className="drag-region h-10 flex items-center justify-between bg-neutral-900 border-b border-neutral-800 px-3 select-none">
      {/* Left: logo + sidebar toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleSidebar}
          className="no-drag p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-nova-500 to-nova-700 flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">N</span>
          </div>
          <span className="text-sm font-semibold text-neutral-200">NovaCode</span>
          <span className="text-[10px] text-neutral-500 bg-neutral-800 px-1.5 py-0.5 rounded">v0.1.0</span>
        </div>
      </div>

      {/* Center: drag area */}
      <div className="flex-1" />

      {/* Right: window controls */}
      <div className="no-drag flex items-center gap-1">
        <button
          onClick={() => window.nova?.window.minimize()}
          className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <button
          onClick={() => window.nova?.window.maximize()}
          className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h16v16H4z" />
          </svg>
        </button>
        <button
          onClick={() => window.nova?.window.close()}
          className="p-1.5 rounded hover:bg-red-600 text-neutral-400 hover:text-white"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
