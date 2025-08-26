'use client';

import { useAuth } from "@/components/AuthProvider";
import UserInfo from "./UserInfo";
import UsernameOverlay from "./UsernameOverlay";

export default function UserInfoWrapper() {
  const { user } = useAuth();

  return (
    <>
      {!user && <UsernameOverlay />}
      {user && <UserInfo />}
    </>
  );
}