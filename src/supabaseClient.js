import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://axgpbuxvvutsohctzpmj.supabase.co'
const supabaseAnonKey = 'sb_publishable_gwS0NHzxN48shr-Fkup6IQ_zmgeADaQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)