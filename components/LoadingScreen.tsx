interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center space-y-6">
        {/* Animated chess pieces */}
        <div className="flex space-x-2 text-5xl">
          <div className="animate-bounce" style={{ animationDelay: '0ms' }}>♔</div>
          <div className="animate-bounce" style={{ animationDelay: '150ms' }}>♕</div>
          <div className="animate-bounce" style={{ animationDelay: '300ms' }}>♔</div>
        </div>
        
        {/* Loading bar */}
        <div className="w-48 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full animate-loading-bar" />
        </div>
        
        {/* Message */}
        <p className="text-lg text-muted-foreground font-medium">
          {message}
        </p>

        <style jsx>{`
          @keyframes loading-bar {
            0% {
              transform: translateX(-100%);
            }
            50% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(100%);
            }
          }
          .animate-loading-bar {
            animation: loading-bar 1.5s ease-in-out infinite;
          }
        `}</style>
      </div>
    </div>
  );
}