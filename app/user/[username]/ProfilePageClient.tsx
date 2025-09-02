"use client";

import { useState } from "react";
import { User, Edit2, Info } from "lucide-react";
import UsernameChangeModal from "@/components/UsernameChangeModal";
import type { User as AuthUser } from "@/types/auth";
import { useRouter } from "next/navigation";

interface ProfilePageClientProps {
  username: string;
  user: AuthUser | null | undefined;
  isOwnProfile: boolean;
  canChangeUsername: boolean;
}

export default function ProfilePageClient({
  username: initialUsername,
  user,
  isOwnProfile,
  canChangeUsername,
}: ProfilePageClientProps) {
  const [isUsernameModalOpen, setIsUsernameModalOpen] = useState(false);
  const [username, setUsername] = useState(initialUsername);
  const router = useRouter();

  const handleUsernameChange = (newUsername: string) => {
    setUsername(newUsername);
    // Redirect to the new profile URL
    router.push(`/user/${newUsername}`);
  };

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Simple Profile Header */}
        <div className="bg-background-secondary rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-lichess-orange-400 to-lichess-orange-600 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{username}</h1>
                
                {/* Show provider info for own profile */}
                {isOwnProfile && user && (
                  <div className="mt-2 flex items-center gap-2">
                    <Info className="h-3 w-3 text-foreground-muted" />
                    <p className="text-xs text-foreground-muted">
                      {user.provider === "lichess" && user.originalUsername && (
                        <>Signed in via Lichess as {user.originalUsername}</>
                      )}
                      {user.provider === "google" && user.originalName && (
                        <>Signed in via Google as {user.originalName}</>
                      )}
                      {user.provider === "guest" && <>Guest account</>}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons for own profile */}
            {isOwnProfile && canChangeUsername && (
              <button
                onClick={() => setIsUsernameModalOpen(true)}
                className="px-4 py-2 text-sm bg-background hover:bg-background-tertiary rounded-lg transition-colors flex items-center gap-2"
              >
                <Edit2 className="h-4 w-4" />
                Change Username
              </button>
            )}
          </div>

          {/* Simple message for now */}
          <div className="text-center py-8 text-foreground-muted">
            <p className="text-sm">Game statistics and history coming soon!</p>
          </div>
        </div>
      </div>

      {/* Username Change Modal */}
      {canChangeUsername && user && (
        <UsernameChangeModal
          isOpen={isUsernameModalOpen}
          onClose={() => setIsUsernameModalOpen(false)}
          currentUsername={username}
          provider={user.provider}
          originalName={user.originalUsername || user.originalName}
          onSuccess={handleUsernameChange}
        />
      )}
    </>
  );
}