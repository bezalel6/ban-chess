"use client";

import React from "react";
import { COLORS, SPACING, SHADOWS } from "@/lib/design-constants";

interface RuleCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  visual?: React.ReactNode;
}

export default function RuleCard({ icon, title, description, visual }: RuleCardProps) {
  return (
    <div className={`bg-${COLORS.background.secondary} rounded-lg ${SPACING.smallCardPadding} ${SHADOWS.md} transition-shadow`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-${COLORS.brand.orange.light} flex items-center justify-center text-${COLORS.brand.orange.primary}`}>
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground mb-1">{title}</h3>
          <p className={`text-sm text-${COLORS.text.muted}`}>{description}</p>
          {visual && <div className="mt-3">{visual}</div>}
        </div>
      </div>
    </div>
  );
}

// Rule Icons as components
export const RuleIcons = {
  Ban: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Cycle: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
};

// Visual components for rules
export const RuleVisuals = {
  TurnCycle: () => (
    <div className="flex items-center gap-2 text-xs">
      <div className={`px-2 py-1 bg-${COLORS.background.tertiary} rounded`}>Black Ban</div>
      <span className={`text-${COLORS.text.subtle}`}>→</span>
      <div className={`px-2 py-1 bg-${COLORS.background.tertiary} rounded`}>White Move</div>
      <span className={`text-${COLORS.text.subtle}`}>→</span>
      <div className={`px-2 py-1 bg-${COLORS.background.tertiary} rounded`}>White Ban</div>
      <span className={`text-${COLORS.text.subtle}`}>→</span>
      <div className={`px-2 py-1 bg-${COLORS.background.tertiary} rounded`}>Black Move</div>
    </div>
  ),
  BanExpiry: () => (
    <div className="flex items-center gap-3 text-xs">
      <div className="relative">
        <div className="px-2 py-1 bg-destructive-500/20 text-destructive-400 rounded">
          e2→e4 banned
        </div>
      </div>
      <span className={`text-${COLORS.text.subtle}`}>→</span>
      <div className="px-2 py-1 bg-success-500/20 text-success-400 rounded">
        After move: Ban expires
      </div>
    </div>
  ),
  BlackFirst: () => (
    <div className="flex items-center gap-2 text-xs">
      <div className={`w-4 h-4 bg-${COLORS.background.tertiary} rounded-full`}></div>
      <span className="text-foreground">Black</span>
      <span className={`text-${COLORS.text.subtle}`}>always bans first</span>
    </div>
  ),
};