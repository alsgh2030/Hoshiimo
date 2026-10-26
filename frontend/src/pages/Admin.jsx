import React, { useEffect, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { api } from '../api';
import { categories, Empty, ErrorBox, Modal, Pager, statuses, yen } from '../components';

const blank = { slug: '', name: '', description: '', category: 'standard', weight_g: 300, price_yen: 1000, stock: 10, is_active: true };

export function Admin({ user, onLogin }) {
  const [tab, setTab] = useState('products');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [summary, setSummary] = useState(null);
  const [data, setData] = useState({ items: [], total: 0 });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(null);
  const [transition, setTransition] = useState(null);
  const [busy, setBusy] = useState(false);
  const refresh = () => setRevision(v => v + 1);
  useEffect(() => {
    if (!user?.is_admin) return;
    let active = true; setLoading(true); setError('');
    Promise.all([api('/admin/summary'), api(`/admin/${tab}?page=${page}`)])
      .then(([s, d]) => { if (active) { setSummary(s); setData(tab === 'audit' ? { items: d } : d); } })
      .catch(e => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user, page, tab, revision]);
  if (!user) return <Empty title="ログインしてください" action={<button className="button" onClick={onLogin}>ログイン</button>} />;
  if (!user.is_admin) return <Empty title="管理者権限が必要です">一般アカウントでは管理画面にアクセスできません。</Empty>;

  async function updateStatus() {
    if (busy) return; setBusy(true); setError('');
    try { await api(`/admin/orders/${transition.id}`, { method: 'PATCH', body: { status: transition.status } }); setTransition(null); refresh(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  return <section className="container page-section admin-page"><div className="section-heading"><div><p className="eyebrow">SHOP MANAGEMENT</p><h1>ショップ管理</h1></div><button className="icon-button" onClick={refresh} aria-label="更新" disabled={loading}><RefreshCw size={20} /></button></div>
    <div className="demo-callout">管理デモです。ステータス変更で実際の出荷やメール送信は行われません。</div>
    {summary && <div className="stat-grid">{[['有効な注文', summary.orders], ['デモ注文総額', yen(summary.demo_revenue_yen)], ['登録ユーザー', summary.users], ['在庫5点未満', summary.low_stock]].map(([label, value]) => <div className="stat-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>}
    <div className="admin-toolbar"><div className="filter-chips">{[['products', '商品・在庫'], ['orders', '注文管理'], ['audit', '操作履歴']].map(([key, label]) => <button key={key} className={tab === key ? 'selected' : ''} onClick={() => { setTab(key); setPage(1); }}>{label}</button>)}</div>{tab === 'products' && <button className="button compact" onClick={() => setEdit({ ...blank })}><Plus size={16} />商品を追加</button>}</div>
    <ErrorBox message={error} retry={refresh} />
    {loading ? <p role="status">読み込み中…</p> : <>
      {tab === 'products' && <div className="table-scroll"><table><thead><tr><th>商品名</th><th>価格</th><th>在庫</th><th>公開状態</th><th>操作</th></tr></thead><tbody>{data.items.map(p => <tr key={p.id}><td><strong>{p.name}</strong><small>{p.slug} · v{p.version}</small></td><td>{yen(p.price_yen)}</td><td><span className={p.stock < 5 ? 'low-stock' : ''}>{p.stock}袋</span></td><td>{p.is_active ? '公開中' : '非公開'}</td><td><button className="text-button" onClick={() => setEdit(p)}>編集</button></td></tr>)}</tbody></table></div>}
      {tab === 'orders' && <div className="table-scroll"><table><thead><tr><th>注文番号</th><th>商品</th><th>合計</th><th>状態</th><th>次の操作</th></tr></thead><tbody>{data.items.map(o => <tr key={o.id}><td className="mono">{o.id.slice(0, 8)}<small>{new Date(o.created_at + 'Z').toLocaleString('ja-JP')}</small></td><td>{o.items.map(i => <small key={i.product_id}>{i.product_name} × {i.quantity}</small>)}</td><td>{yen(o.total_yen)}</td><td><span className={`status ${o.status}`}>{statuses[o.status]}</span></td><td>{o.status === 'placed' && <div className="stack-actions"><button className="text-button" onClick={() => setTransition({ id: o.id, status: 'packed' })}>梱包済みにする</button><button className="text-button danger" onClick={() => setTransition({ id: o.id, status: 'cancelled' })}>キャンセル</button></div>}{o.status === 'packed' && <button className="text-button" onClick={() => setTransition({ id: o.id, status: 'shipped' })}>発送済みにする</button>}</td></tr>)}</tbody></table></div>}
      {tab === 'audit' && <div className="audit-list">{data.items.map(entry => <details key={entry.id}><summary><strong>{entry.action}</strong><span>担当 #{entry.actor_id} · {new Date(entry.created_at + 'Z').toLocaleString('ja-JP')}</span></summary><p className="mono">対象: {entry.target}</p><pre>{JSON.stringify(JSON.parse(entry.detail), null, 2)}</pre></details>)}</div>}
      {!data.items.length && <Empty title="データはありません" />}
      {tab === 'audit' ? <div className="pager"><button className="text-button" disabled={page === 1} onClick={() => setPage(p => p - 1)}>前へ</button><span>{page}</span><button className="text-button" disabled={data.items.length < 30} onClick={() => setPage(p => p + 1)}>次へ</button></div> : <Pager page={page} total={data.total} pageSize={tab === 'products' ? 20 : 10} onChange={setPage} />}
    </>}
    {edit && <ProductEditor product={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); refresh(); }} />}
    {transition && <Modal title={`「${statuses[transition.status]}」に変更しますか？`} onClose={() => !busy && setTransition(null)}><p>この操作はデモ注文の状態を変更します。キャンセル時は在庫を戻します。</p><ErrorBox message={error} /><button className="button full" disabled={busy} onClick={updateStatus}>変更を確定</button></Modal>}
  </section>;
}

function ProductEditor({ product, onClose, onSaved }) {
  const [form, setForm] = useState({ ...product });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  function field(key) { return { value: form[key], onChange: e => setForm({ ...form, [key]: e.target.value }) }; }
  async function submit(event) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    const body = Object.fromEntries(Object.keys(blank).map(key => [key, form[key]]));
    for (const key of ['weight_g', 'price_yen', 'stock']) body[key] = Number(body[key]);
    if (product.id) body.expected_version = product.version;
    try { await api(`/admin/products${product.id ? '/' + product.id : ''}`, { method: product.id ? 'PUT' : 'POST', body }); onSaved(); }
    catch (e) { setError(e.message + (e.status === 409 ? ' この画面を閉じて一覧を更新し、最新の在庫を確認してください。' : '')); }
    finally { setBusy(false); }
  }
  return <Modal title={product.id ? '商品を編集' : '商品を追加'} onClose={() => !busy && onClose()}><form className="form-stack" onSubmit={submit}>
    <label>商品名<input {...field('name')} required maxLength={120} /></label>
    <label>商品コード（英小文字・数字・ハイフン）<input {...field('slug')} required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={100} /></label>
    <label>説明<textarea {...field('description')} required maxLength={4000} rows={3} /></label>
    <label>カテゴリ<select {...field('category')}>{Object.entries(categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
    <div className="form-row"><label>内容量 (g)<input {...field('weight_g')} type="number" min={1} max={10000} step={1} required /></label><label>価格 (円)<input {...field('price_yen')} type="number" min={1} max={1000000} step={1} required /></label><label>在庫数<input {...field('stock')} type="number" min={0} max={1000000} step={1} required /></label></div>
    <label className="checkbox"><input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />商品を公開する</label>
    <ErrorBox message={error} /><button className="button full" disabled={busy}>{busy ? '保存中…' : '保存する'}</button>
  </form></Modal>;
}
