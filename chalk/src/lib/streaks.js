import { supabase } from './supabase'

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function getStreaks() {
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('streaks')
    .select(`
      *,
      streak_logs (
        id,
        checked_in_at,
        created_at
      ),
      milestone_streaks (
        milestone_id,
        milestones (
          id,
          title,
          mission_id,
          missions ( id, title )
        )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function getStreakById(id) {
  const { data, error } = await supabase
    .from('streaks')
    .select(`
      *,
      streak_logs (*),
      milestone_streaks (
        milestone_id,
        milestones ( id, title, mission_id, missions ( id, title ) )
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// ─── Create / Update / Delete ─────────────────────────────────────────────────

export async function createStreak({ title, description, color }) {
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('streaks')
    .insert({
      user_id: user.id,
      title,
      description: description || null,
      color: color || '#c8f04c',
      current_streak: 0,
      longest_streak: 0,
      shields_remaining: 3,
      is_active: true,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateStreak(id, updates) {
  const { data, error } = await supabase
    .from('streaks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteStreak(id) {
  const { error } = await supabase
    .from('streaks')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ─── Check-in ─────────────────────────────────────────────────────────────────

export async function checkInStreak(streakId) {
  const { data, error } = await supabase
    .rpc('check_in_streak', { p_streak_id: streakId })

  if (error) throw error
  return data
}

export async function getTodayCheckIn(streakId) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data, error } = await supabase
    .from('streak_logs')
    .select('*')
    .eq('streak_id', streakId)
    .gte('checked_in_at', today.toISOString())
    .lt('checked_in_at', tomorrow.toISOString())
    .maybeSingle()

  if (error) throw error
  return data
}

// ─── Shields ──────────────────────────────────────────────────────────────────

export async function rechargeShields() {
  const { data, error } = await supabase.rpc('recharge_shields')
  if (error) throw error
  return data
}

// ─── Streak log history ───────────────────────────────────────────────────────

export async function getStreakLogs(streakId, days = 30) {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from('streak_logs')
    .select('*')
    .eq('streak_id', streakId)
    .gte('checked_in_at', since.toISOString())
    .order('checked_in_at', { ascending: true })

  if (error) throw error
  return data
}

// ─── Milestone connections ────────────────────────────────────────────────────

export async function connectStreakToMilestone(streakId, milestoneId) {
  const { error } = await supabase
    .from('milestone_streaks')
    .insert({ streak_id: streakId, milestone_id: milestoneId })

  if (error) throw error
}

export async function disconnectStreakFromMilestone(streakId, milestoneId) {
  const { error } = await supabase
    .from('milestone_streaks')
    .delete()
    .eq('streak_id', streakId)
    .eq('milestone_id', milestoneId)

  if (error) throw error
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function isCheckedInToday(streakLogs = []) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return streakLogs.some(log => {
    const logDate = new Date(log.checked_in_at)
    logDate.setHours(0, 0, 0, 0)
    return logDate.getTime() === today.getTime()
  })
}

export function buildCalendarDots(streakLogs = [], days = 30) {
  const map = {}
  streakLogs.forEach(log => {
    const d = new Date(log.checked_in_at)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    map[key] = true
  })

  const result = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    result.push({ date: new Date(d), checked: !!map[key] })
  }
  return result
}