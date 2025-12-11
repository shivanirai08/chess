"use client";

import { motion } from "framer-motion";
import { useState } from "react";

interface WeeklyInsightsProps {
  weekOffset: number;
  activeTab: "elo" | "games";
  dateRange: string;
  canGoNext: boolean;
  onTabChange: (tab: "elo" | "games") => void;
  onNavigate: (direction: "prev" | "next" | "current") => void;
  children: React.ReactNode;
  isMobile?: boolean;
}

export function WeeklyInsights({
  activeTab,
  dateRange,
  canGoNext,
  onTabChange,
  onNavigate,
  children,
  isMobile = false,
}: WeeklyInsightsProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className={`rounded-xl p-4 flex flex-col bg-white/5 backdrop-blur-xs ${isMobile ? '' : 'flex-1 min-h-0'}`}
    >
      {/* Header with Week Navigation */}
      <div className="flex items-center justify-between mb-4">
        <h3 className={`${isMobile ? 'text-sm sm:text-base' : 'text-lg'} font-bold`}>
          Weekly Insights
        </h3>
        <div className={`flex items-center gap-1 sm:gap-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>
          <button
            onClick={() => onNavigate("prev")}
            className={`px-2 ${isMobile ? 'sm:px-3 py-1.5 sm:py-2' : 'py-1'} rounded hover:bg-white/10 transition-colors cursor-pointer ${isMobile ? 'text-xs sm:text-sm' : ''} font-medium`}
            aria-label="Previous week"
          >
            &lt;{!isMobile && " Prev"}
          </button>
          <button
            onClick={() => onNavigate("current")}
            className={`px-2 sm:px-3 ${isMobile ? 'py-1.5 sm:py-2' : 'py-1.5'} rounded ${isMobile ? 'bg-white/5 text-white' : 'bg-white/10 text-white'} text-xs font-semibold cursor-pointer whitespace-nowrap ${isMobile ? 'hover:bg-white/10' : ''} transition-colors`}
          >
            {dateRange}
          </button>
          <button
            onClick={() => onNavigate("next")}
            disabled={!canGoNext}
            className={`px-2 ${isMobile ? 'sm:px-3 py-1.5 sm:py-2' : 'py-1'} rounded transition-colors ${isMobile ? 'text-xs sm:text-sm' : ''} font-medium ${
              !canGoNext ? "opacity-30 cursor-not-allowed" : "hover:bg-white/10 cursor-pointer"
            }`}
            aria-label="Next week"
          >
            {!isMobile && "Next "}&gt;
          </button>
        </div>
      </div>

      {/* Tab Buttons */}
      <div className="flex gap-2 mb-4">
        {[
          { key: "elo" as const, label: "ELO Trend" },
          { key: "games" as const, label: isMobile ? "Games" : "Game Breakdown" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex-1 ${isMobile ? 'py-2 sm:py-2.5' : 'py-2'} border rounded ${isMobile ? 'text-sm sm:text-base' : 'text-sm'} font-medium cursor-pointer transition-all ${
              activeTab === tab.key
                ? "border-primary bg-primary/10 text-white"
                : "border-white/10 hover:bg-white/20"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Chart Content */}
      <div className={isMobile ? 'min-h-[180px]' : 'flex-1 min-h-0'}>
        {children}
      </div>
    </motion.section>
  );
}
