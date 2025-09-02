"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import SignInPanel from "@/components/SignInPanel";
import Image from "next/image";
import { Database, Users, Shield, CheckCircle, XCircle } from "lucide-react";

export default function TestAuthPage() {
  const { data: session, status } = useSession();
  const [dbUsers, setDbUsers] = useState<number>(0);
  const [dbError, setDbError] = useState<string>("");

  useEffect(() => {
    // Check database users count
    fetch('/api/test-db')
      .then(res => res.json())
      .then(data => {
        setDbUsers(data.count);
        if (data.error) setDbError(data.error);
      })
      .catch(err => {
        console.error(err);
        setDbError('Failed to connect to database');
      });
  }, [session]);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo.png"
              alt="BanChess"
              width={64}
              height={64}
              className="object-contain"
            />
          </div>
          <h1 className="text-4xl font-bold">
            Database & Authentication <span className="text-lichess-orange-500">Test</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Verify Prisma integration and user persistence
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Session Status Card */}
          <div className="bg-background-secondary rounded-2xl border border-border p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-lichess-orange-500" />
              <h2 className="text-xl font-semibold">Session Status</h2>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 px-3 bg-background rounded-lg">
                <span className="text-muted-foreground">Status</span>
                <span className="font-mono flex items-center gap-2">
                  {status === 'authenticated' ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-muted-foreground" />
                  )}
                  {status}
                </span>
              </div>
              
              {session?.user && (
                <>
                  <div className="flex items-center justify-between py-2 px-3 bg-background rounded-lg">
                    <span className="text-muted-foreground">Username</span>
                    <span className="font-medium text-lichess-orange-500">
                      {session.user.username}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-2 px-3 bg-background rounded-lg">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-mono text-sm">
                      {session.user.email || 'N/A (Guest)'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-2 px-3 bg-background rounded-lg">
                    <span className="text-muted-foreground">Provider</span>
                    <span className="capitalize">{session.user.provider}</span>
                  </div>
                  
                  <div className="flex items-center justify-between py-2 px-3 bg-background rounded-lg">
                    <span className="text-muted-foreground">Account Type</span>
                    <span className={session.user.provider === 'guest' ? "text-yellow-500" : "text-green-500"}>
                      {session.user.provider === 'guest' ? 'Guest' : 'Registered'}
                    </span>
                  </div>
                </>
              )}
            </div>

            {session && (
              <button
                onClick={() => signOut()}
                className="w-full py-3 px-4 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-colors font-medium"
              >
                Sign Out
              </button>
            )}
          </div>

          {/* Database Status Card */}
          <div className="bg-background-secondary rounded-2xl border border-border p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-lichess-orange-500" />
              <h2 className="text-xl font-semibold">Database Status</h2>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 px-3 bg-background rounded-lg">
                <span className="text-muted-foreground">Connection</span>
                <span className="flex items-center gap-2">
                  {dbError ? (
                    <>
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="text-red-500">Error</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-green-500">Connected</span>
                    </>
                  )}
                </span>
              </div>
              
              <div className="flex items-center justify-between py-2 px-3 bg-background rounded-lg">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Total Users
                </span>
                <span className="font-bold text-2xl text-lichess-orange-500">
                  {dbUsers}
                </span>
              </div>
              
              {dbError && (
                <div className="p-3 bg-red-500/10 text-red-500 rounded-lg text-sm">
                  {dbError}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                PostgreSQL database with Prisma ORM
              </p>
            </div>
          </div>
        </div>

        {/* Authentication Panel */}
        {!session && (
          <div className="bg-background-secondary rounded-2xl border border-border p-6">
            <h2 className="text-xl font-semibold mb-6 text-center">Test Authentication</h2>
            <SignInPanel compact />
          </div>
        )}

        {/* Info Section */}
        <div className="bg-background-secondary/50 rounded-2xl border border-border/50 p-6">
          <h3 className="font-semibold mb-3">🔍 What&apos;s Being Tested</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>User persistence in PostgreSQL database via Prisma</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Email-based account linking (same email = same user)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Guest users get Guest_xxx IDs (no email required)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>OAuth users get chess-themed usernames</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}