import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dsxyadtvmymujrxlqbjp.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzeHlhZHR2bXltdWpyeGxxYmpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2Nzg3NzEsImV4cCI6MjA3NTI1NDc3MX0.9dwre3dIMaRAqspFkENc4x7UVc2Q7oLuzCR93Op9yek'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)