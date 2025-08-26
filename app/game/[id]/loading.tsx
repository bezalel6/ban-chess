export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="container-custom">
        <div className="game-info text-center">
          <div className="loading-spinner mb-4"></div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Loading game...
          </h2>
          <p className="text-gray-400">Preparing the board for you.</p>
        </div>
      </div>
    </div>
  );
}