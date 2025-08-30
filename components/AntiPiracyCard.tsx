'use client';

import { useState, useEffect } from 'react';
import { Car, X } from 'lucide-react';

interface AntiPiracyCardProps {
  onPirateFlagClick?: () => void;
  onReset?: () => void;
}

export default function AntiPiracyCard({
  onPirateFlagClick,
  onReset,
}: AntiPiracyCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [answer, setAnswer] = useState<'yes' | 'no' | null>(null);
  const [showFlag, setShowFlag] = useState(false);

  // Load pirate flag state from localStorage on mount
  useEffect(() => {
    const pirateRevealed = localStorage.getItem('pirateRevealed');
    if (pirateRevealed === 'true') {
      setIsFlipped(true);
      setShowFlag(true);
      setAnswer('yes');
    }
  }, []);

  const handleCardClick = () => {
    if (!isFlipped && !showFlag) {
      setIsFlipped(true);
    }
  };

  const handleYes = () => {
    setAnswer('yes');
    // Delay the flag transformation to show "Really?" message
    setTimeout(() => {
      setShowFlag(true);
      localStorage.setItem('pirateRevealed', 'true');
      // Dispatch custom event to notify ThemeBrowser
      window.dispatchEvent(new Event('pirateUnlocked'));
    }, 1500);
  };

  const handleNo = () => {
    setAnswer('no');
    setShowFlag(false);
    // Delay flip back to show "Good choice!" message
    setTimeout(() => {
      setIsFlipped(false);
      setAnswer(null);
    }, 1500);
  };

  const handleReset = () => {
    setShowFlag(false);
    setAnswer(null);
    // Animate flip back to question mark
    setTimeout(() => {
      setIsFlipped(false);
    }, 300);
    localStorage.removeItem('pirateRevealed');
    if (onReset) {
      onReset();
    }
  };

  const handleFlagClick = () => {
    if (showFlag && onPirateFlagClick) {
      onPirateFlagClick();
    }
  };

  if (showFlag) {
    // Pirate flag state
    return (
      <div className='relative bg-gray-900 rounded-xl p-6 shadow-md hover:shadow-lg transition-all'>
        {/* Reset button in corner */}
        <button
          onClick={handleReset}
          className='absolute top-2 right-2 p-1 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors z-10'
          aria-label='Reset'
        >
          <X className='h-3 w-3 text-gray-400 hover:text-white' />
        </button>

        <div
          className='cursor-pointer transform hover:scale-105 transition-transform'
          onClick={handleFlagClick}
        >
          <div className='flex flex-col items-center'>
            {/* Just use skull and crossbones emoji */}
            <span className='text-6xl animate-pulse'>☠️</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='relative h-full' style={{ perspective: '1000px' }}>
      <div
        className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front face - Question mark */}
        <div
          className='absolute w-full h-full bg-gray-900 rounded-xl shadow-md backface-hidden cursor-pointer'
          style={{ backfaceVisibility: 'hidden' }}
          onClick={handleCardClick}
        >
          <div className='flex flex-col items-center justify-center h-full p-6'>
            <div className='text-6xl text-amber-500 animate-pulse'>?</div>
          </div>
        </div>

        {/* Back face - Question */}
        <div
          className='absolute w-full h-full bg-gray-900 rounded-xl shadow-md backface-hidden rotate-y-180'
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <div className='flex flex-col items-center justify-center h-full p-6'>
            {/* Question icon */}
            <Car className='h-8 w-8 text-amber-500 mb-4' />

            {/* Question */}
            <h3 className='font-medium text-white mb-4 text-center'>
              Would you steal a car?
            </h3>

            {/* Answer buttons */}
            <div className='flex gap-3 w-full'>
              <button
                onClick={handleYes}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                  answer === 'yes'
                    ? 'bg-red-600 text-white scale-95'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
                disabled={answer === 'yes'}
              >
                Yes
              </button>
              <button
                onClick={handleNo}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                  answer === 'no'
                    ? 'bg-green-600 text-white scale-95'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                No
              </button>
            </div>

            {/* Response message - positioned above buttons */}
            {answer && (
              <div className='absolute inset-x-0 top-4 flex justify-center pointer-events-none'>
                {answer === 'no' && (
                  <p className='text-sm text-green-400 animate-fade-in bg-gray-800/90 px-3 py-1 rounded-full'>
                    Good choice! 👍
                  </p>
                )}
                {answer === 'yes' && !showFlag && (
                  <p className='text-sm text-red-400 animate-fade-in bg-gray-800/90 px-3 py-1 rounded-full'>
                    Really? 🤔
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
