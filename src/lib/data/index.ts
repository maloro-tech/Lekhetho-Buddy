import { getLocalRepository } from "./local-repository";
import type { Repository } from "./repository";
import { createSupabaseRepository } from "./supabase-repository";

export function createRepository(): Repository {
  if (import.meta.env.VITE_DATA_BACKEND === "supabase") {
    return createSupabaseRepository();
  }
  return getLocalRepository();
}

export const repository = createRepository();
