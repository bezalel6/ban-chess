"use client";

import React, { useState, useEffect } from "react";
import { X, AlertCircle, Check, Loader2, Info } from "lucide-react";
import { useToast } from "@/lib/toast/toast-context";
import { signOut } from "next-auth/react";

interface UsernameChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsername: string;
  provider: string;
  originalName?: string;
  onSuccess?: (newUsername: string) => void;
}

export default function UsernameChangeModal({
  isOpen,
  onClose,
  currentUsername,
  provider,
  originalName,
  onSuccess,
}: UsernameChangeModalProps) {
  const [newUsername, setNewUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkTimeout, setCheckTimeout] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);
  
  const { showToast } = useToast();

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setNewUsername("");
      setError(null);
      setIsAvailable(null);
      setIsChecking(false);
    }
  }, [isOpen]);

  // Debounced username availability check
  useEffect(() => {
    if (checkTimeout) {
      clearTimeout(checkTimeout);
    }

    if (newUsername.length < 3) {
      setIsAvailable(null);
      setError(null);
      return;
    }

    if (newUsername.toLowerCase() === currentUsername.toLowerCase()) {
      setError("This is already your username");
      setIsAvailable(false);
      return;
    }

    setIsChecking(true);
    setError(null);

    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/user/username?username=${encodeURIComponent(newUsername)}`,
        );
        const data = await response.json();

        if (data.available) {
          setIsAvailable(true);
          setError(null);
        } else {
          setIsAvailable(false);
          setError(data.error || "This username is not available");
        }
      } catch {
        setError("Failed to check username availability");
        setIsAvailable(false);
      } finally {
        setIsChecking(false);
      }
    }, 500); // 500ms debounce

    setCheckTimeout(timeout);

    return () => {
      if (checkTimeout) {
        clearTimeout(checkTimeout);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newUsername, currentUsername]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAvailable || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/user/username", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ newUsername }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Close modal immediately to prevent error flash
        onClose();
        
        // Show success toast
        showToast(
          "Username changed successfully! Signing you out for the changes to take effect...",
          "success",
          5000
        );
        
        // Call the onSuccess callback if provided
        if (onSuccess) {
          onSuccess(data.newUsername);
        }
        
        // Wait a moment for the toast to be visible, then sign out
        setTimeout(() => {
          signOut({ 
            callbackUrl: '/auth/signin',
            redirect: true 
          });
        }, 2000);
        
      } else if (response.status === 429) {
        // Rate limit error
        const nextDate = data.nextChangeAvailable 
          ? new Date(data.nextChangeAvailable).toLocaleDateString()
          : null;
        const errorMessage = nextDate 
          ? `${data.error}. You can change your username again on ${nextDate}`
          : data.error;
        setError(errorMessage);
      } else {
        setError(data.error || "Failed to change username");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-background-secondary rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-foreground-muted hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <h2 className="text-xl font-bold mb-2">Change Username</h2>
        <p className="text-sm text-foreground-muted mb-4">
          Choose a unique username for your chess profile
        </p>

        {/* Provider info (Lichess-style) */}
        {originalName && (
          <div className="bg-background-tertiary rounded-lg p-3 mb-4 flex items-start gap-2">
            <Info className="h-4 w-4 text-lichess-orange-500 mt-0.5" />
            <div className="text-xs">
              <p className="text-foreground-muted">
                Signed in via {provider === "lichess" ? "Lichess" : "Google"} as{" "}
                <span className="font-medium text-foreground">
                  {originalName}
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Username rules */}
        <div className="bg-background-tertiary rounded-lg p-3 mb-4">
          <p className="text-xs font-medium mb-2">Username Requirements:</p>
          <ul className="text-xs text-foreground-muted space-y-1">
            <li>• 3-20 characters long</li>
            <li>• Letters, numbers, underscores, and hyphens only</li>
            <li>• Cannot contain offensive language</li>
            <li>• Cannot impersonate system accounts</li>
            <li>• Can be changed once every 7 days</li>
          </ul>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="username"
              className="block text-sm font-medium mb-2"
            >
              New Username
            </label>
            <div className="relative">
              <input
                id="username"
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Enter new username"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-lichess-orange-500 pr-10"
                maxLength={20}
                disabled={isSubmitting}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isChecking && (
                  <Loader2 className="h-4 w-4 animate-spin text-foreground-muted" />
                )}
                {!isChecking && isAvailable === true && (
                  <Check className="h-4 w-4 text-green-500" />
                )}
                {!isChecking && isAvailable === false && (
                  <X className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>

            {/* Character count */}
            <div className="mt-1 text-xs text-foreground-muted text-right">
              {newUsername.length}/20 characters
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-900/50 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}


          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm bg-background hover:bg-background-tertiary rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isAvailable || isSubmitting || isChecking}
              className="flex-1 px-4 py-2 text-sm bg-lichess-orange-500 text-white rounded-lg hover:bg-lichess-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Changing...
                </>
              ) : (
                "Change Username"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
