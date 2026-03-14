import { supabase } from "./supabase";

// ── STREAKS ───────────────────────────────────────────────────────────────────

export async function getStreaks() {
  const { data, error } = await supabase
    .from("streaks")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

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

export async function deleteStreak(id) {
  const { error } = await supabase
    .from("streaks")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function checkInStreak(streakId) {
  const { error } = await supabase
    .rpc("check_in_streak", { p_streak_id: streakId });

  if (error) throw error;
}

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

export async function initStreaks() {
  await supabase.rpc("recharge_shields");
  await supabase.rpc("handle_missed_streaks");
}

// ── MILESTONE CONNECTIONS ─────────────────────────────────────────────────────

export async function connectStreakToMilestone(milestoneId, streakId) {
  const { error } = await supabase
    .from("milestone_streaks")
    .insert({ milestone_id: milestoneId, streak_id: streakId });

  if (error) throw error;
}

export async function disconnectStreakFromMilestone(milestoneId, streakId) {
  const { error } = await supabase
    .from("milestone_streaks")
    .delete()
    .eq("milestone_id", milestoneId)
    .eq("streak_id", streakId);

  if (error) throw error;
}