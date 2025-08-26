import { Suspense } from 'react';
import QueueSection from '@/components/QueueSection';
import HowToPlay from '@/components/HowToPlay';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-4xl">
          <div className="bg-slate-800 rounded-2xl border border-slate-700/50 shadow-2xl p-8 md:p-12">
            
            {/* Title Section */}
            <div className="text-center mb-8">
              <div className="text-7xl mb-4">♟️</div>
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
                Ban Chess Web
              </h1>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                A strategic chess variant where you can ban your opponent&apos;s moves
              </p>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-700/50 my-8"></div>

            {/* Queue Section with Suspense */}
            <Suspense fallback={
              <div className="text-center mb-8">
                <div className="loading-spinner mb-4" />
                <p className="text-lg text-gray-300">Loading queue...</p>
              </div>
            }>
              <QueueSection />
            </Suspense>

            {/* Divider */}
            <div className="border-t border-slate-700/50 my-8"></div>

            {/* How to Play Section */}
            <HowToPlay />
          </div>
        </div>
      </main>
    </div>
  );
}