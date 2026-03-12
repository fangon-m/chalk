import { supabase } from "./supabase";

// ── MISSIONS ──────────────────────────────────────────────────────────────────

// Fetch all missions for the logged-in user, ordered by priority
export async function getMissions() {
  const { data, error } = await supabase
    .from("missions")
    .select(`
      *,
      milestones (
        *,
        milestone_streaks (
          streak_id,
          streaks ( id, name, current_streak, longest_streak, shields )
        )
      )
    `)
    .order("priority", { ascending: true });

  if (error) throw error;
  return data;
}

// Create a new mission
export async function createMission(form) {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("missions")
    .insert({
      user_id: user.id,
      title: form.title,
      description: form.description,
      priority: form.priority,
      timeline: form.timeline || null,
      progress: 0,
    })
    .select()
    .single();

  if (error) throw error;

  // insert milestones if any
  if (form.milestones?.length > 0) {
    const milestonesWithMissionId = form.milestones.map((m, i) => ({
      mission_id: data.id,
      title: m.title,
      completed: false,
      order: i,
    }));

    const { data: insertedMilestones, error: mlError } = await supabase
      .from("milestones")
      .insert(milestonesWithMissionId)
      .select();

    if (mlError) throw mlError;

    // connect streaks to milestones if any
    const streakLinks = [];
    form.milestones.forEach((m, i) => {
      if (m.connectedStreaks?.length > 0) {
        m.connectedStreaks.forEach((streakId) => {
          streakLinks.push({
            milestone_id: insertedMilestones[i].id,
            streak_id: streakId,
          });
        });
      }
    });

    if (streakLinks.length > 0) {
      const { error: linkError } = await supabase
        .from("milestone_streaks")
        .insert(streakLinks);
      if (linkError) throw linkError;
    }
  }

  return data;
}

// Update an existing mission
export async function updateMission(id, form) {
  const { data, error } = await supabase
    .from("missions")
    .update({
      title: form.title,
      description: form.description,
      priority: form.priority,
      timeline: form.timeline || null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Update mission progress (calls the Postgres function)
export async function refreshMissionProgress(missionId) {
  const { data, error } = await supabase
    .rpc("calculate_mission_progress", { mission_id: missionId });

  if (error) throw error;

  // write the result back to the mission row
  await supabase
    .from("missions")
    .update({ progress: data })
    .eq("id", missionId);

  return data;
}

// Delete a mission (cascades to milestones + milestone_streaks)
export async function deleteMission(id) {
  const { error } = await supabase
    .from("missions")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// Reorder missions priorities after drag
export async function updateMissionPriorities(missions) {
  const updates = missions.map((m, i) =>
    supabase
      .from("missions")
      .update({ priority: i + 1 })
      .eq("id", m.id)
  );

  await Promise.all(updates);
}


// ── MILESTONES ────────────────────────────────────────────────────────────────

// Toggle milestone completed
export async function toggleMilestone(id, completed) {
  const { error } = await supabase
    .from("milestones")
    .update({ completed })
    .eq("id", id);

  if (error) throw error;
}

// Connect a streak to a milestone
export async function connectStreakToMilestone(milestoneId, streakId) {
  const { error } = await supabase
    .from("milestone_streaks")
    .insert({ milestone_id: milestoneId, streak_id: streakId });

  if (error) throw error;
}

// Disconnect a streak from a milestone
export async function disconnectStreakFromMilestone(milestoneId, streakId) {
  const { error } = await supabase
    .from("milestone_streaks")
    .delete()
    .eq("milestone_id", milestoneId)
    .eq("streak_id", streakId);

  if (error) throw error;
}