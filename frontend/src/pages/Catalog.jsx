import React, { useEffect, useState } from 'react';
import { ArrowRight, Plus, Search, X } from 'lucide-react';
import { api } from '../api';
import { categories, Empty, ErrorBox, Pager, ProductPhoto, yen } from '../components';

export function Catalog({ home = false, onDetail, onAdd, busy, searchParams = '' }) {
  const params = new URLSearchParams(searchParams);
  const query = params.get('q') || '';
  const category = params.get('category') || '';
  const sort = params.get('sort') || 'recommended';
  const inStock = params.get('in_stock') === 'true';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [search, setSearch] = useState(query);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const size = home ? 4 : 12;
  useEffect(() => setSearch(query), [query]);
  function update(changes) {
    const next = new URLSearchParams(searchParams);
    next.delete('page');
    Object.entries(changes).forEach(([k, v]) => v ? next.set(k, v) : next.delete(k));
    location.hash = `shop${next.size ? '?' + next : ''}`;
  }
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    const request = new URLSearchParams({ page, page_size: size, q: query, sort, in_stock: inStock });
    if (category) request.set('category', category);
    api(`/products?${request}`, { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setData(result); })
      .catch(e => { if (e.name !== 'AbortError') setError('商品を読み込めませんでした。少し時間をおいて、もう一度お試しください。'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, category, query, sort, inStock, size, retry]);
  return <section className="catalog container" aria-label="商品一覧">
    <div className="section-heading"><div><p className="eyebrow">{home ? 'THE EVERYDAY COLLECTION' : 'FIND YOUR FAVORITE'}</p><h2>{home ? 'ひと息に、ひとくち。' : 'おいしい出会いを、ここから。'}</h2><p className="section-subtitle">{home ? 'いつものおやつも、大切な人への贈りものも。' : 'かたち、食感、サイズ。あなたにぴったりの干し芋を。'}</p></div>{home && <a className="text-link" href="#shop">すべての商品を見る <ArrowRight size={18} /></a>}</div>
    {!home && <>
      <form className="catalog-search" role="search" onSubmit={e => { e.preventDefault(); update({ q: search.trim() }); }}>
        <Search size={21} aria-hidden="true" /><input aria-label="商品を検索" placeholder="「丸干し」「食べ比べ」「800g」など" value={search} maxLength={100} onChange={e => setSearch(e.target.value)} />
        {search && <button type="button" className="icon-button" aria-label="検索をクリア" onClick={() => { setSearch(''); update({ q: '' }); }}><X size={18} /></button>}<button className="button compact" type="submit">検索</button>
      </form>
      <div className="catalog-toolbar"><div className="filter-chips" aria-label="商品カテゴリ"><button aria-pressed={!category} className={!category ? 'selected' : ''} onClick={() => update({ category: '' })}>すべて</button>{Object.entries(categories).map(([key, label]) => <button key={key} aria-pressed={category === key} className={category === key ? 'selected' : ''} onClick={() => update({ category: key })}>{label}</button>)}</div>
        <label className="sort-select"><span className="sr-only">並び順</span><select aria-label="並び順" value={sort} onChange={e => update({ sort: e.target.value })}><option value="recommended">おすすめ順</option><option value="price_asc">価格が安い順</option><option value="price_desc">価格が高い順</option><option value="newest">新着順</option></select></label>
      </div>
      <div className="catalog-meta"><p role="status">{loading ? '読み込み中…' : `${query ? `「${query}」の検索結果 · ` : ''}${data.total} 件の商品`}</p><label><input type="checkbox" checked={inStock} onChange={e => update({ in_stock: e.target.checked ? 'true' : '' })} /> 在庫ありのみ</label></div>
    </>}
    <ErrorBox message={error} retry={() => setRetry(v => v + 1)} />
    {loading ? <div className="product-grid" aria-busy="true" aria-label="商品を読み込み中">{[0,1,2,3].map(i => <div className="skeleton" key={i} />)}</div> : !error && (!data.items.length ? <Empty title="該当する商品がありません" action={<button className="button secondary" onClick={() => { location.hash = 'shop'; }}>条件をクリアする</button>}>別のキーワードやカテゴリでお試しください。</Empty> : <div className="product-grid">{data.items.map(p => <article className="product-card" key={p.id}>
      <button className="product-image" onClick={() => onDetail(p)} aria-label={`${p.name}の詳細`}><ProductPhoto product={p} />{!p.stock && <span className="sold-out">SOLD OUT</span>}</button>
      <div className="product-info"><div className="product-kicker"><span>{categories[p.category]}</span><span>{p.weight_g.toLocaleString()}g</span></div><h3><button onClick={() => onDetail(p)}>{p.name}</button></h3><p>{p.description}</p><div className="product-bottom"><strong>{yen(p.price_yen)}<small>参考価格</small></strong><button className="add-button" aria-label={`${p.name}をカートに入れる`} disabled={busy || !p.stock} onClick={() => onAdd(p)}><Plus size={20} /></button></div></div>
    </article>)}</div>)}
    {!home && !error && !loading && <Pager page={page} total={data.total} pageSize={size} onChange={v => { update({ page: String(v) }); document.querySelector('.catalog')?.scrollIntoView({ behavior: 'smooth' }); }} />}
  </section>;
}
