import { createClient } from "@repo/auth/client";
import { getApiUrl } from "./lib/api";

const getBaseUrl = () => `${typeof window !== "undefined" ? getApiUrl() : (process.env.NEXT_PUBLIC_API_URL as string)}/auth`;

export const authClient = createClient(getBaseUrl());

export const { signIn, signUp, useSession, signOut } = authClient;

