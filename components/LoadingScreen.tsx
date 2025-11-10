interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center space-y-4">
        <div className="loading-spinner"></div>
        <p className="text-lg text-muted-foreground">
          {message}
        </p>
      </div>
    </div>
  );
}