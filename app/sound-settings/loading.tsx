export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Sound Settings</h1>
      
      <div className="bg-background-secondary rounded-lg p-6">
        <div className="space-y-6">
          {/* Sound Explorer skeleton */}
          <div>
            <div className="mb-4">
              <div className="h-6 bg-background rounded w-40 animate-pulse" />
            </div>
            
            {/* Theme tabs skeleton */}
            <div className="flex gap-3 mb-4">
              <div className="flex-1 border border-lichess-orange-500/30 rounded-lg p-3 bg-lichess-orange-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-4 bg-lichess-orange-500/20 rounded w-32 animate-pulse" />
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-10 bg-background rounded-lg animate-pulse w-20" />
                  ))}
                </div>
              </div>
            </div>
            
            {/* Sound grid skeleton */}
            <div className="bg-background rounded-lg p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="h-12 bg-background-secondary rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          </div>
          
          {/* Game Event Sounds skeleton */}
          <div className="border-t border-gray-700 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-6 bg-background rounded w-40 animate-pulse" />
              <div className="h-8 bg-gray-700 rounded-lg w-32 animate-pulse" />
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-20 bg-background rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}