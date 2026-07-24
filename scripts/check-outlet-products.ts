import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } }
)

async function main() {
  const { data } = await supabase
    .from('products')
    .select('slug, name, olivator_score, status')
    .or('name.ilike.%(poškozený obal)%,name.ilike.%outlet%')
    .order('olivator_score', { ascending: false, nullsFirst: false })

  console.log('Outlet/damaged products in DB:', data?.length ?? 0)
  data?.forEach(p => console.log(` score=${p.olivator_score} status=${p.status} name="${p.name}"  slug="${p.slug}"`))
}

main()
