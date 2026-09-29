import { createClient } from '@supabase/supabase-js';
import BazariyaaLanding from './BazariyaaLanding';
import { normalizeProduct } from '../lib/adapter';

export default async function Page() {
  const supabase = createClient(
    'https://mpnywlderrwnpajinbpq.supabase.co',
    process.env.SUPABASE_SECRET_KEY!
  );

  const { data: rawProducts } = await supabase
    .from('raw_products')
    .select('*')
    .limit(24);

  const normalizedProducts =
    rawProducts?.map((row) =>
      normalizeProduct(row.data, null)
    ) || [];

  return <BazariyaaLanding initialProducts={normalizedProducts} />;
}