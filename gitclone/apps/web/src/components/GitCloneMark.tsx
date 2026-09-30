import React from "react";

export function GitCloneMark({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center rounded-lg bg-gradient-to-br from-[#238636] to-[#1f6feb] p-1 shadow-sm ${className}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full text-white">
        <circle cx="18" cy="18" r="3" />
        <circle cx="6" cy="6" r="3" />
        <path d="M18 9a9 9 0 0 1-9 9" />
        <line x1="6" y1="9" x2="6" y2="21" />
      </svg>
    </div>
  );
}
