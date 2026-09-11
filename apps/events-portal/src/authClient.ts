import { createClient } from "@repo/auth/client";
import { getApiUrl } from "./lib/api";

const getBaseUrl = () => `${typeof window !== "undefined" ? getApiUrl() : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001/api")}/auth`;

export const authClient = createClient(getBaseUrl());

export const { signIn, signUp, useSession, signOut } = authClient;

