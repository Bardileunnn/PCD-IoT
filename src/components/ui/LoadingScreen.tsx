// LoadingScreen.tsx - Pure Monochrome with Tailwind CSS
import React from 'react';

interface LoadingScreenProps {
  progress: number;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ progress }) => {
  return (
    <div className="fixed top-0 left-0 w-full h-full bg-[#0a0e27] flex items-center justify-center z-[9999]">
      <div 
        className="font-['Press_Start_2P'] text-6xl md:text-5xl max-sm:text-4xl text-white"
        style={{ textShadow: '2px 2px 0 #333333' }}
      >
        {Math.round(progress)}%
      </div>
    </div>
  );
};

export default LoadingScreen;