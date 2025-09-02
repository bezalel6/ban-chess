"use client";

import { useState } from "react";
import { Menu, X, ChevronRight } from "lucide-react";
import Link from "next/link";

interface MobileMenuSection {
  title: string;
  items: { label: string; href: string; description?: string }[];
}

const menuSections: MobileMenuSection[] = [
  {
    title: "Learn",
    items: [
      {
        label: "Rules & Tutorial",
        href: "/learn",
        description: "Learn how Ban Chess works",
      },
      {
        label: "Puzzles",
        href: "/learn#puzzles",
        description: "Practice with tactical puzzles",
      },
    ],
  },
  {
    title: "Play",
    items: [
      {
        label: "Play Solo",
        href: "/play/local",
        description: "Practice against yourself",
      },
      {
        label: "Find Opponent",
        href: "/play/online",
        description: "Play against another player",
      },
    ],
  },
  {
    title: "Tools",
    items: [
      {
        label: "Analysis board",
        href: "/analysis",
        description: "Analyze positions and games",
      },
    ],
  },
];

function MenuSection({
  section,
  onItemClick,
}: {
  section: MobileMenuSection;
  onItemClick: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left font-medium text-foreground hover:bg-background-tertiary transition-colors"
      >
        <span>{section.title}</span>
        <ChevronRight
          className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
        />
      </button>

      {isExpanded && (
        <div className="bg-background-tertiary">
          {section.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onItemClick}
              className="block px-8 py-3 text-sm text-foreground-muted hover:text-foreground hover:bg-background-secondary transition-colors"
            >
              <div className="font-medium">{item.label}</div>
              {item.description && (
                <div className="text-xs text-foreground-subtle mt-1">
                  {item.description}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = () => setIsOpen(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden p-2 text-foreground-muted hover:text-foreground hover:bg-background-secondary rounded-md transition-colors"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={handleClose} />

          {/* Sidebar */}
          <div className="fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-background border-r border-border overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center space-x-2">
                <div className="text-xl">♟️</div>
                <span className="text-lg font-semibold text-foreground">
                  Ban Chess
                </span>
              </div>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-background-secondary rounded-md transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation Sections */}
            <nav className="py-2">
              {menuSections.map((section) => (
                <MenuSection
                  key={section.title}
                  section={section}
                  onItemClick={handleClose}
                />
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
