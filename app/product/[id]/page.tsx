import { createClient } from '@supabase/supabase-js';
import { normalizeProduct } from '../../../lib/adapter';
import ProductClient from './ProductClient';

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const productId = resolvedParams.id;

  const supabase = createClient(
    'https://mpnywlderrwnpajinbpq.supabase.co', process.env.SUPABASE_SECRET_KEY!
  );

  const { data: rawProduct } = await supabase
    .from('raw_products')
    .select('data')
    .eq('id', productId)
    .single();

  if (!rawProduct) {
    return <div className="p-20 text-center text-slate-500">Product not found</div>;
  }

  const { data: rawHistory } = await supabase
    .from('raw_price_history')
    .select('data')
    .ilike('id', `%${productId}%`)
    .limit(1)
    .single();

  const product = normalizeProduct(rawProduct.data, rawHistory?.data || null);

  return <ProductClient product={product} />;
}