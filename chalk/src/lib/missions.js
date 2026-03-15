import { supabase } from "./supabase";

// ── MISSIONS ──────────────────────────────────────────────────────────────────

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

  // Update titles of existing milestones
  const existingMilestones = (form.milestones || []).filter(
    (m) => m.id && !m.id.startsWith("ml_")
  );

  if (existingMilestones.length > 0) {
    await Promise.all(
      existingMilestones.map((m) =>
        supabase
          .from("milestones")
          .update({ title: m.title })
          .eq("id", m.id)
      )
    );
  }

  // Insert brand-new milestones
  const newMilestones = (form.milestones || []).filter(
    (m) => !m.id || m.id.startsWith("ml_")
  );

  if (newMilestones.length > 0) {
    const { data: inserted, error: mlError } = await supabase
      .from("milestones")
      .insert(
        newMilestones.map((m, i) => ({
          mission_id: id,
          title: m.title,
          completed: false,
          order: existingMilestones.length + i,
        }))
      )
      .select();

    if (mlError) throw mlError;

    const streakLinks = [];
    newMilestones.forEach((m, i) => {
      (m.connectedStreaks || []).forEach((streakId) => {
        streakLinks.push({ milestone_id: inserted[i].id, streak_id: streakId });
      });
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

// ── PROGRESS CALCULATION ──────────────────────────────────────────────────────

export async function recalculateMissionProgress(missionId) {
  console.log("[progress] recalculate called for:", missionId);

  const { data: mission, error } = await supabase
    .from("missions")
    .select(`
      id,
      created_at,
      timeline,
      milestones (
        id,
        completed,
        milestone_streaks (
          streaks ( current_streak, longest_streak )
        )
      )
    `)
    .eq("id", missionId)
    .single();

  if (error) {
    console.error("[progress] fetch error:", error);
    throw error;
  }

  console.log("[progress] mission fetched:", {
    id: mission.id,
    created_at: mission.created_at,
    timeline: mission.timeline,
    milestones_count: mission.milestones?.length,
  });

  const milestones = mission.milestones || [];
  const total = milestones.length;

  if (total === 0) {
    console.log("[progress] early exit: no milestones → 0%");
    await supabase.from("missions").update({ progress: 0 }).eq("id", missionId);
    return 0;
  }

  const doneCount = milestones.filter((m) => m.completed).length;
  console.log("[progress] doneCount:", doneCount, "/ total:", total);

  if (doneCount === total) {
    console.log("[progress] early exit: all milestones done → 100%");
    await supabase.from("missions").update({ progress: 100 }).eq("id", missionId);
    return 100;
  }

  // ── Time score (80%) ────────────────────────────────────────────────────────
  let timeScore = 0;
  if (mission.timeline) {
    const start = new Date(mission.created_at).getTime();
    const end   = new Date(mission.timeline).getTime();
    const now   = Date.now();
    const span  = end - start;

    console.log("[progress] time calc:", {
      created_at: mission.created_at,
      timeline: mission.timeline,
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      span_days: Math.round(span / 86400000),
      elapsed_days: Math.round((now - start) / 86400000),
    });

    if (span > 0) {
      timeScore = Math.min(1, Math.max(0, (now - start) / span));
    }
    console.log("[progress] timeScore:", timeScore.toFixed(3));
  } else {
    console.log("[progress] no timeline set — timeScore stays 0");
  }

  // ── Streak score (20%) ──────────────────────────────────────────────────────
  const allStreaks = milestones.flatMap((m) =>
    (m.milestone_streaks || []).map((ms) => ms.streaks).filter(Boolean)
  );

  console.log("[progress] connected streaks found:", allStreaks.length);

  let streakScore = 0;
  if (allStreaks.length > 0) {
    const ratios = allStreaks.map((s) => {
      if (!s.longest_streak || s.longest_streak === 0) {
        return s.current_streak > 0 ? 1 : 0;
      }
      return Math.min(1, s.current_streak / s.longest_streak);
    });
    streakScore = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    console.log("[progress] streak ratios:", ratios, "→ streakScore:", streakScore.toFixed(3));
  }

  // ── Combined ────────────────────────────────────────────────────────────────
  const formulaProgress = timeScore * 0.8 + streakScore * 0.2;
  const milestoneRatio = doneCount / total;
  const raw = Math.max(formulaProgress, milestoneRatio);
  const progress = Math.min(100, Math.round(raw * 100));

  console.log("[progress] final:", {
    formulaProgress: (formulaProgress * 100).toFixed(1) + "%",
    milestoneRatio: (milestoneRatio * 100).toFixed(1) + "%",
    final: progress + "%",
  });

  await supabase
    .from("missions")
    .update({ progress })
    .eq("id", missionId);

  return progress;
}

export async function deleteMission(id) {
  const { error } = await supabase
    .from("missions")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

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

export async function toggleMilestone(id, completed) {
  const { error } = await supabase
    .from("milestones")
    .update({ completed })
    .eq("id", id);

  if (error) throw error;
}

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