import { SYSTEM_CATEGORIES } from '../app/constants/systemCategories';
import { supabase } from './supabaseClient';

export async function ensureSystemCategories(userId: string) {
  if (!supabase) return;

  const timestamp = new Date().toISOString();
  const rows = SYSTEM_CATEGORIES.map((category) => ({
    id: category.id,
    user_id: userId,
    name: category.name,
    icon: category.icon,
    color: category.color,
    group: category.group,
    is_system: true,
    updated_at: timestamp,
    deleted_at: null,
  }));

  const { error } = await supabase
    .from('categories')
    .upsert(rows);

  if (error) {
    throw error;
  }
}
