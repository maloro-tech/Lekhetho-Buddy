import type { Repository } from "./repository";

const MESSAGE =
  "Supabase is not connected. Apply supabase/migrations/20261031120000_init.sql, then implement this adapter with the anon key only. Never put the service-role key in client code.";

function notReady(method: string): never {
  throw new Error(`${MESSAGE} Missing method: ${method}.`);
}

/**
 * Table mapping for the adapter that replaces localStorage:
 * profiles, businesses, business_contacts, sales_entries, expense_entries,
 * journey_steps, chat_sessions, chat_messages, help_requests, officer_notes.
 * Reads and writes go through the signed-in Supabase client so RLS applies.
 * Officer summaries call public.business_record_summary, not the line-item tables.
 */
export function createSupabaseRepository(): Repository {
  return {
    init: () => notReady("init"),
    currentUser: () => notReady("currentUser"),
    signUp: () => notReady("signUp"),
    signIn: () => notReady("signIn"),
    signOut: () => notReady("signOut"),
    setLanguage: () => notReady("setLanguage"),
    getBusiness: () => notReady("getBusiness"),
    saveBusiness: () => notReady("saveBusiness"),
    getDraft: () => notReady("getDraft"),
    saveDraft: () => notReady("saveDraft"),
    clearDraft: () => notReady("clearDraft"),
    listSales: () => notReady("listSales"),
    listExpenses: () => notReady("listExpenses"),
    addSale: () => notReady("addSale"),
    updateSale: () => notReady("updateSale"),
    deleteSale: () => notReady("deleteSale"),
    addExpense: () => notReady("addExpense"),
    updateExpense: () => notReady("updateExpense"),
    deleteExpense: () => notReady("deleteExpense"),
    listJourney: () => notReady("listJourney"),
    setJourneyStatus: () => notReady("setJourneyStatus"),
    listMessages: () => notReady("listMessages"),
    addMessage: () => notReady("addMessage"),
    listMyHelpRequests: () => notReady("listMyHelpRequests"),
    createHelpRequest: () => notReady("createHelpRequest"),
    officerOverview: () => notReady("officerOverview"),
    officerListRequests: () => notReady("officerListRequests"),
    officerGetRequest: () => notReady("officerGetRequest"),
    officerMarkInProgress: () => notReady("officerMarkInProgress"),
    officerAddNote: () => notReady("officerAddNote"),
    officerResolve: () => notReady("officerResolve"),
    officerListBusinesses: () => notReady("officerListBusinesses"),
    officerGetBusiness: () => notReady("officerGetBusiness"),
    officerListActivity: () => notReady("officerListActivity"),
  };
}
