import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Recursively delete everything under a storage prefix. Supabase `list()` only
 * returns immediate children, and folders come back with `id === null`, so we
 * recurse into them and batch-remove the files we find.
 *
 * Used by destructive flows (account + organization deletion) to reclaim space,
 * since DB cascades never touch Storage objects. Requires an admin client.
 */
export async function removeFolder(
  admin: SupabaseClient,
  bucket: string,
  prefix: string,
): Promise<void> {
  const { data: entries, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error || !entries || entries.length === 0) return;

  const files: string[] = [];
  for (const entry of entries) {
    const path = `${prefix}/${entry.name}`;
    if (entry.id === null) {
      await removeFolder(admin, bucket, path); // folder → recurse
    } else {
      files.push(path);
    }
  }
  if (files.length > 0) {
    await admin.storage.from(bucket).remove(files);
  }
}
