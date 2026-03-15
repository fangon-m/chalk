import { supabase } from "./supabase";

export async function getJournals() {
  const { data, error } = await supabase
    .from("journals")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createJournal(form) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("journals")
    .insert({ user_id: user.id, title: form.title, content: form.content })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateJournal(id, form) {
  const { data, error } = await supabase
    .from("journals")
    .update({
      title: form.title,
      content: form.content,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteJournal(id) {
  const { error } = await supabase.from("journals").delete().eq("id", id);
  if (error) throw error;
}