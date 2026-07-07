/// <reference types="node" />
// Unit 10.1 verification: confirm the `listing-photos` bucket exists on the
// live Supabase project. Does not create the bucket automatically — per the
// unit spec that's a manual dashboard step (public read, service-role writes).

import 'dotenv/config'
import { supabase } from '../src/lib/supabase'

const BUCKET = 'listing-photos'

void (async () => {
  const { data, error } = await supabase.storage.listBuckets()
  if (error) {
    console.error(`Failed to list buckets: ${error.message}`)
    process.exit(1)
  }

  const found = data?.find((b) => b.name === BUCKET)
  if (!found) {
    console.error(`Bucket "${BUCKET}" not found.`)
    console.error(
      `Create it manually in the Supabase dashboard:\n` +
        `  Storage → New bucket → name "${BUCKET}" → Public bucket ON\n`
    )
    process.exit(1)
  }

  console.log(`Bucket "${BUCKET}" exists.  public=${found.public}`)
  if (!found.public) {
    console.error(
      `Bucket exists but is not public — listing photos need public read.\n` +
        `Update it in the dashboard: Storage → ${BUCKET} → Configuration → Public bucket ON.`
    )
    process.exit(1)
  }

  process.exit(0)
})().catch((err) => {
  console.error('Verification script crashed:', err)
  process.exit(1)
})
