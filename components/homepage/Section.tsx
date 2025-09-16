import React from 'react';

interface SectionProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl';
  className?: string;
}

export default function Section({ 
  children, 
  maxWidth = '4xl', 
  className = '' 
}: SectionProps) {
  const maxWidthClass = `max-w-${maxWidth}`;
  
  return (
    <section className={`${maxWidthClass} mx-auto ${className}`}>
      {children}
    </section>
  );
}