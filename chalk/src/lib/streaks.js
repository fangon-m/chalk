import { supabase } from "./supabase";

// ── STREAKS ───────────────────────────────────────────────────────────────────

// Fetch all streaks for the logged-in user
export async function getStreaks() {
  const { data, error } = await supabase
    .from("streaks")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

// Create a new streak
export async function createStreak(form) {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("streaks")
    .insert({
      user_id: user.id,
      name: form.name,
      description: form.description || null,
      current_streak: 0,
      longest_streak: 0,
      shields: 3,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Update a streak's name/description
export async function updateStreak(id, form) {
  const { data, error } = await supabase
    .from("streaks")
    .update({
      name: form.name,
      description: form.description || null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Delete a streak (cascades to streak_logs + milestone_streaks)
export async function deleteStreak(id) {
  const { error } = await supabase
    .from("streaks")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// Check in for today (calls Postgres function)
export async function checkInStreak(streakId) {
  const { error } = await supabase
    .rpc("check_in_streak", { p_streak_id: streakId });

  if (error) throw error;
}

// Fetch streak logs for a streak (for heatmap/history)
export async function getStreakLogs(streakId) {
  const { data, error } = await supabase
    .from("streak_logs")
    .select("*")
    .eq("streak_id", streakId)
    .order("date", { ascending: false });

  if (error) throw error;
  return data;
}

// ── APP INIT ──────────────────────────────────────────────────────────────────
// Call this once on app load — handles missed days + monthly shield recharge

export async function initStreaks() {
  // recharge shields if it's the 1st of the month
  await supabase.rpc("recharge_shields");

  // burn shields / reset streaks for any missed days
  await supabase.rpc("handle_missed_streaks");
}