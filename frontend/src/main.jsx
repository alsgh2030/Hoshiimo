import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowRight, Check, Leaf, LogOut, Menu, Minus, Package, Plus, Search, ShieldCheck, ShoppingBag, UserRound, X } from 'lucide-react';
import { api, acceptSession, restoreSession, watchSession } from './api';
import { categories, Empty, ErrorBox, Modal, PackageArt, Pager, statuses, yen } from './components';
import { Admin } from './pages/Admin';
import './styles.css';

const emptyCart = { items: [], subtotal_yen: 0, shipping_yen: 0, total_yen: 0 };

function App() {
  const [route, setRoute] = useState(location.hash.slice(1) || 'home');
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [cart, setCart] = useState(emptyCart);
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState('');
  const [globalError, setGlobalError] = useState('');
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const [revision, setRevision] = useState(0);
  const checkoutKey = useRef(null);
  const cartBusy = useRef(false);
  const userGeneration = useRef(0);
  const navigate = (where) => { location.hash = where; setMenu(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  useEffect(() => {
    const handler = () => setRoute(location.hash.slice(1) || 'home');
    window.addEventListener('hashchange', handler);
    watchSession(next => { userGeneration.current += 1; setUser(next); if (!next) setCart(emptyCart); });
    restoreSession().catch(error => setGlobalError(error.message)).finally(() => setAuthReady(true));
    return () => { window.removeEventListener('hashchange', handler); watchSession(() => {}); };
  }, []);
  const loadCart = useCallback(async () => {
    const generation = userGeneration.current;
    const result = await api('/cart');
    if (generation === userGeneration.current) setCart(result);
  }, []);
  useEffect(() => { if (user) loadCart().catch(error => setGlobalError(error.message)); }, [user, loadCart]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 4000); return () => clearTimeout(timer); }, [notice]);

  async function changeCart(productId, quantity) {
    if (!user) { setModal({ type: 'auth' }); return; }
    if (cartBusy.current) return;
    cartBusy.current = true; setBusy(true); setGlobalError('');
    try {
      const next = quantity === 0 ? await api(`/cart/items/${productId}`, { method: 'DELETE' })
        : await api(`/cart/items/${productId}`, { method: 'PUT', body: { quantity } });
      setCart(next); checkoutKey.current = null; setNotice('カートを更新しました');
    } catch (error) { setGlobalError(error.message); }
    finally { cartBusy.current = false; setBusy(false); }
  }

  async function checkout() {
    if (cartBusy.current) return;
    cartBusy.current = true; setBusy(true); setGlobalError('');
    checkoutKey.current ||= crypto.randomUUID();
    try {
      const order = await api('/orders', { method: 'POST', headers: { 'Idempotency-Key': checkoutKey.current } });
      setCart(emptyCart); checkoutKey.current = null; setModal({ type: 'success', order });
      setRevision(v => v + 1);
    } catch (error) {
      setGlobalError(error.message);
      // Keep the key after an uncertain network result so retry cannot duplicate an order.
      if (error.status === 409) { checkoutKey.current = null; await loadCart().catch(() => {}); }
    } finally { cartBusy.current = false; setBusy(false); }
  }

  async function logout() {
    try { await api('/auth/logout', { method: 'POST' }); acceptSession(null); setModal(null); navigate('home'); }
    catch (error) { setGlobalError(error.message); }
  }
  const count = cart.items.reduce((sum, line) => sum + line.quantity, 0);
  return <>
    <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); document.getElementById('main-content').focus(); }}>本文へスキップ</a>
    <div className="demo-bar"><span>PORTFOLIO DEMO</span> 学習・作品展示用サイトです。実際の注文・決済・配送は行われません。</div>
    <header className="site-header">
      <a href="#home" className="brand" aria-label="Hoshiimo ホーム"><span className="brand-seal">芋</span><span>ほしいも<small>HOSHIIMO / TSUKADA STUDY</small></span></a>
      <nav className={menu ? 'main-nav open' : 'main-nav'} aria-label="メインナビゲーション">
        <a href="#home" className={route === 'home' ? 'active' : ''} onClick={() => setMenu(false)}>ホーム</a>
        <a href="#shop" className={route === 'shop' ? 'active' : ''} onClick={() => setMenu(false)}>干し芋を選ぶ</a>
        <a href="#story" className={route === 'story' ? 'active' : ''} onClick={() => setMenu(false)}>このサイトについて</a>
        {user && <a href="#orders" onClick={() => setMenu(false)}>注文履歴</a>}
        {user?.is_admin && <a href="#admin" onClick={() => setMenu(false)}>管理画面</a>}
      </nav>
      <div className="header-actions">
        <button className="icon-button account-button" onClick={() => setModal({ type: user ? 'account' : 'auth' })} aria-label={user ? 'アカウント' : 'ログイン'} disabled={!authReady}><UserRound size={21} /><span>{user ? user.username : 'ログイン'}</span></button>
        <button className="icon-button bag-button" onClick={() => setModal({ type: user ? 'cart' : 'auth' })} aria-label={`カート ${count}点`}><ShoppingBag size={21} /><span className="count">{count}</span></button>
        <button className="icon-button mobile-menu" aria-label="メニュー" aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</button>
      </div>
    </header>
    {globalError && !modal && <div className="container"><ErrorBox message={globalError} retry={() => { setGlobalError(''); setRevision(v => v + 1); }} /></div>}
    <main id="main-content" tabIndex="-1">
      {route === 'home' && <>
        <section className="hero">
          <div className="hero-copy"><p className="eyebrow">A LITTLE SWEETNESS, EVERY DAY</p><h1>干し芋のある、<br />やさしい毎日。</h1><p>ひと息つく時間に、自然な甘さを。<br />ひとくちからはじまる、小さなしあわせ。</p><button className="button" onClick={() => navigate('shop')}>お気に入りの干し芋を見つける <ArrowRight size={18} /></button><div className="hero-note"><span className="tiny-line" /> 塚田商店を題材にした、オンラインショップ制作作品</div></div>
          <div className="hero-visual"><span className="hero-orbit" /><span className="hero-japanese">おいしい時間を、<br />すこしずつ。</span><PackageArt hero /><div className="hero-stamp">紅はるか<br /><small>DEMO COLLECTION</small></div><span className="art-caption">オリジナルのパッケージイラスト / 商品写真ではありません</span></div>
        </section>
        <div className="values-strip"><span><Leaf size={19} /> 素朴なおやつを楽しむ</span><span><Package size={19} /> お好みのサイズを選ぶ</span><span><ShieldCheck size={19} /> 決済のないデモ体験</span></div>
        <Catalog key={`home-${revision}`} home onDetail={p => setModal({ type: 'product', product: p })} onAdd={p => changeCart(p.id, (cart.items.find(i => i.product.id === p.id)?.quantity || 0) + 1)} busy={busy} />
        <section className="story-band"><p className="eyebrow">SMALL SHOP, NEXT CHAPTER</p><h2>お店のこれからを、<br />ひとつのコードから。</h2><p>実在するお店を題材に、買い物の体験と、<br />その裏側で動く仕組みをつくっています。</p><a className="text-link" href="#story">このプロジェクトについて <ArrowRight size={17} /></a></section>
      </>}
      {route === 'shop' && <Catalog key={`shop-${revision}`} onDetail={p => setModal({ type: 'product', product: p })} onAdd={p => changeCart(p.id, (cart.items.find(i => i.product.id === p.id)?.quantity || 0) + 1)} busy={busy} />}
      {route === 'story' && <Story />}
      {route === 'orders' && <Orders key={`${user?.id}-${revision}`} user={user} onLogin={() => setModal({ type: 'auth' })} onChanged={() => setRevision(v => v + 1)} />}
      {route === 'admin' && <Admin user={user} onLogin={() => setModal({ type: 'auth' })} />}
      {!['home', 'shop', 'story', 'orders', 'admin'].includes(route) && <Empty title="ページが見つかりません" action={<a href="#home" className="button">ホームへ戻る</a>} />}
    </main>
    <footer><div className="footer-top"><a href="#home" className="brand"><span className="brand-seal">芋</span><span>ほしいも<small>HOSHIIMO PORTFOLIO</small></span></a><div><p>干し芋のある、やさしい毎日。</p><a href="https://t-shoten.jp/" target="_blank" rel="noreferrer">実際のお買い物は塚田商店の公式サイトへ ↗</a></div></div><div className="footer-bottom"><span>Built by Minho Choi · React / FastAPI / MySQL</span><span>非公式ポートフォリオ · 商品・価格・在庫はサンプル</span></div></footer>
    {notice && <div className="toast" role="status"><Check size={18} />{notice}</div>}
    {modal?.type === 'auth' && <AuthModal onClose={() => setModal(null)} onSuccess={() => { setModal(null); setGlobalError(''); setNotice('ログインしました'); }} />}
    {modal?.type === 'account' && <Modal title="マイアカウント" onClose={() => setModal(null)}><p>{user?.username} さん</p><p className="muted">{user?.email}</p><ErrorBox message={globalError} /><button className="button secondary full" onClick={() => { setModal(null); navigate('orders'); }}>注文履歴を見る</button><button className="text-button logout" onClick={logout}><LogOut size={16} />ログアウト</button></Modal>}
    {modal?.type === 'product' && <Modal title={modal.product.name} wide onClose={() => setModal(null)}><div className="product-detail"><PackageArt category={modal.product.category} /><div><p className="eyebrow">{categories[modal.product.category]} · {modal.product.weight_g}g</p><h3>{modal.product.name}</h3><p>{modal.product.description}</p><p className="detail-price">{yen(modal.product.price_yen)}<small>参考価格 / デモ</small></p><p className="muted">デモ在庫：{modal.product.stock}袋</p><ErrorBox message={globalError} /><button className="button full" disabled={busy || !modal.product.stock} onClick={() => changeCart(modal.product.id, (cart.items.find(i => i.product.id === modal.product.id)?.quantity || 0) + 1)}><ShoppingBag size={18} />カートに入れる</button><p className="fineprint">商品画像はイラストです。実際の商品情報・価格とは異なります。</p></div></div></Modal>}
    {modal?.type === 'cart' && <Modal title={`お買い物かご (${count})`} onClose={() => !busy && setModal(null)} wide>
      <ErrorBox message={globalError} />
      {!cart.items.length ? <Empty title="かごはまだ空っぽです" action={<button className="button" onClick={() => { setModal(null); navigate('shop'); }}>干し芋を選ぶ <ArrowRight size={17} /></button>}>お気に入りの一袋を探してみませんか。</Empty> : <>
        <div className="cart-lines">{cart.items.map(({ product: p, quantity, line_total_yen }) => <div className="cart-line" key={p.id}><PackageArt category={p.category} /><div className="cart-line-body"><h3>{p.name}</h3><span className="muted">{p.weight_g}g · {yen(p.price_yen)}</span>{(!p.is_active || p.stock < quantity) && <p className="stock-warning">販売状況が変わりました。数量を変更するか削除してください。</p>}<div className="quantity"><button onClick={() => changeCart(p.id, quantity - 1)} disabled={busy} aria-label={`${p.name}を1点減らす`}><Minus size={14} /></button><span>{quantity}</span><button onClick={() => changeCart(p.id, quantity + 1)} disabled={busy || quantity >= 20 || quantity >= p.stock} aria-label={`${p.name}を1点増やす`}><Plus size={14} /></button></div></div><div className="cart-line-price"><strong>{yen(line_total_yen)}</strong><button className="text-button" disabled={busy} onClick={() => changeCart(p.id, 0)}>削除</button></div></div>)}</div>
        <div className="cart-totals"><div><span>小計</span><strong>{yen(cart.subtotal_yen)}</strong></div><div><span>デモ送料</span><strong>{yen(cart.shipping_yen)}</strong></div><div className="total"><span>合計</span><strong>{yen(cart.total_yen)}</strong></div></div>
        <p className="fineprint">デモ送料は600円、5,000円以上で無料です。実店舗の送料規定とは異なります。カートでは在庫は確保されません。</p>
        <div className="demo-callout">これは模擬注文です。支払い・配送・住所入力はありません。</div>
        <button className="button full" disabled={busy || cart.items.some(i => !i.product.is_active || i.quantity > i.product.stock)} onClick={checkout}>{busy ? '処理中…' : 'デモ注文を確定する'}<ArrowRight size={18} /></button>
      </>}
    </Modal>}
    {modal?.type === 'success' && <Modal title="デモ注文を受け付けました" onClose={() => setModal(null)}><div className="success-icon"><Check size={30} /></div><p>注文データと在庫が更新されました。</p><p className="fineprint">注文番号：{modal.order.id}</p><p className="detail-price">{yen(modal.order.total_yen)}</p><div className="demo-callout">実際の決済・配送は行われません。</div><button className="button full" onClick={() => { setModal(null); navigate('orders'); }}>注文履歴を見る</button></Modal>}
  </>;
}

function Catalog({ home = false, onDetail, onAdd, busy }) {
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const size = home ? 4 : 12;
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    const params = new URLSearchParams({ page, page_size: size, q: query });
    if (category) params.set('category', category);
    api(`/products?${params}`, { signal: controller.signal }).then(setData)
      .catch(e => { if (e.name !== 'AbortError') setError('商品を取得できません。APIサーバーとDBの起動を確認してください。'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, category, query, size, retry]);
  return <section className="catalog container">
    <div className="section-heading"><div><p className="eyebrow">{home ? 'FIND YOUR FAVORITE' : 'OUR COLLECTION'}</p><h2>{home ? '今日は、どの干し芋にしよう。' : '干し芋を選ぶ'}</h2></div>{home ? <a className="text-link" href="#shop">すべての商品 <ArrowRight size={18} /></a> : <span className="muted">{data.total} 件の商品</span>}</div>
    {!home && <div className="catalog-toolbar"><div className="filter-chips"><button className={!category ? 'selected' : ''} onClick={() => { setCategory(''); setPage(1); }}>すべて</button>{Object.entries(categories).map(([key, label]) => <button key={key} className={category === key ? 'selected' : ''} onClick={() => { setCategory(key); setPage(1); }}>{label}</button>)}</div><form className="search" onSubmit={e => { e.preventDefault(); setQuery(search); setPage(1); }}><input aria-label="商品名で検索" placeholder="商品名で検索" value={search} maxLength={100} onChange={e => setSearch(e.target.value)} /><button aria-label="検索"><Search size={18} /></button></form></div>}
    <ErrorBox message={error} retry={() => setRetry(v => v + 1)} />
    {loading ? <div className="product-grid" aria-busy="true" aria-label="商品を読み込み中">{[0,1,2,3].map(i => <div className="skeleton" key={i} />)}</div> : !error && (!data.items.length ? <Empty title="該当する商品がありません">別の商品名やカテゴリでお試しください。</Empty> : <div className="product-grid">{data.items.map((p, i) => <article className="product-card" key={p.id}><button className={`product-image tone-${p.category}`} onClick={() => onDetail(p)} aria-label={`${p.name}の詳細`}><span className="product-tag">{categories[p.category]}</span><PackageArt category={p.category} variant={i} />{!p.stock && <span className="sold-out">SOLD OUT</span>}</button><div className="product-info"><span className="product-weight">BENIHARUKA · {p.weight_g}g</span><h3><button onClick={() => onDetail(p)}>{p.name}</button></h3><p>{p.description}</p><div className="product-bottom"><strong>{yen(p.price_yen)}<small>デモ価格</small></strong><button className="add-button" aria-label={`${p.name}をカートに入れる`} disabled={busy || !p.stock} onClick={() => onAdd(p)}><Plus size={20} /></button></div></div></article>)}</div>)}
    {!home && !error && <Pager page={page} total={data.total} pageSize={size} onChange={setPage} />}
  </section>;
}

function AuthModal({ onClose, onSuccess }) {
  const [signup, setSignup] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); if (busy) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (new TextEncoder().encode(values.password).length > 72) { setError('パスワードはUTF-8で72バイト以内にしてください。'); return; }
    setBusy(true); setError('');
    try { acceptSession(await api(`/auth/${signup ? 'signup' : 'login'}`, { method: 'POST', body: values })); onSuccess(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <Modal title={signup ? 'アカウントをつくる' : 'おかえりなさい'} onClose={() => !busy && onClose()}><p className="muted">デモ用アカウントで、お買い物の流れを体験できます。</p><div className="demo-callout">実際に使っているパスワードや個人情報は入力せず、デモ用の情報をお使いください。</div><form onSubmit={submit} className="form-stack" key={String(signup)}>
    {signup && <label>お名前（ニックネーム）<input name="username" required maxLength={40} autoComplete="nickname" /></label>}
    <label>メールアドレス<input name="email" type="email" required maxLength={254} autoComplete="email" placeholder="demo@example.com" /></label>
    <label>パスワード<input name="password" type="password" required minLength={8} maxLength={72} autoComplete={signup ? 'new-password' : 'current-password'} /></label><p className="fineprint">8文字以上、UTF-8で72バイト以内。</p>
    <ErrorBox message={error} /><button className="button full" disabled={busy}>{busy ? '処理中…' : signup ? 'アカウントを作成' : 'ログイン'}<ArrowRight size={18} /></button></form>
    <button className="text-button auth-toggle" disabled={busy} onClick={() => { setSignup(!signup); setError(''); }}>{signup ? 'アカウントをお持ちの方はこちら' : '初めての方はこちら — 新規登録'}</button>
  </Modal>;
}

function Orders({ user, onLogin, onChanged }) {
  const [data, setData] = useState({ items: [], total: 0 });
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [cancelId, setCancelId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!user) return;
    let active = true; setLoading(true); setError('');
    api(`/orders?page=${page}`).then(result => { if (active) setData(result); })
      .catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, user, retry]);
  if (!user) return <Empty title="注文履歴を見るにはログインしてください" action={<button className="button" onClick={onLogin}>ログイン</button>} />;
  async function cancel() {
    if (busy) return; setBusy(true); setError('');
    try { await api(`/orders/${cancelId}/cancel`, { method: 'POST' }); setCancelId(null); onChanged(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <section className="container page-section"><p className="eyebrow">YOUR ORDERS</p><h1>注文履歴</h1><p className="muted">デモ注文の記録です。受付済みの注文はキャンセルできます。</p><ErrorBox message={error} retry={() => setRetry(v => v + 1)} />
    {loading ? <p role="status">読み込み中…</p> : !error && !data.items.length ? <Empty title="まだ注文はありません" action={<a className="button" href="#shop">干し芋を選ぶ</a>} /> : data.items.map(order => <article className="order-card" key={order.id}><div className="order-top"><div><span className="eyebrow">{new Date(order.created_at + 'Z').toLocaleDateString('ja-JP')}</span><p className="order-number">{order.id}</p></div><span className={`status ${order.status}`}>{statuses[order.status]}</span></div>{order.items.map(item => <div className="order-line" key={item.product_id}><span>{item.product_name} × {item.quantity}</span><strong>{yen(item.unit_price_yen * item.quantity)}</strong></div>)}<div className="order-line muted"><span>デモ送料</span><span>{yen(order.shipping_yen)}</span></div><div className="order-bottom"><strong>合計 {yen(order.total_yen)}</strong>{order.status === 'placed' && <button className="text-button" onClick={() => setCancelId(order.id)}>注文をキャンセル</button>}</div></article>)}
    <Pager page={page} total={data.total} pageSize={10} onChange={setPage} />
    {cancelId && <Modal title="デモ注文をキャンセルしますか？" onClose={() => !busy && setCancelId(null)}><p>注文を取り消し、商品を在庫に戻します。</p><ErrorBox message={error} /><button className="button full" onClick={cancel} disabled={busy}>キャンセルを確定する</button></Modal>}
  </section>;
}

function Story() {
  return <section className="container story-page page-section"><p className="eyebrow">ABOUT THIS PROJECT</p><h1>お店の未来に、<br />技術でできること。</h1><p className="story-lead">Hoshiimo は、茨城県の干し芋店「塚田商店」を題材に制作した、バックエンド開発のポートフォリオです。</p><div className="story-columns"><div><h2>小さなお店から、開発の実践へ。</h2><p>将来、お店の運営を技術面から支えたい。その思いを出発点に、商品を探し、かごに入れ、注文する一連の体験を形にしています。</p><p>フロントエンドだけでなく、認証、データベース設計、在庫管理、注文の整合性まで、一つひとつ学びながらつくるプロジェクトです。</p></div><div className="story-note"><h2>このサイトについて</h2><p>公式通販サイトではありません。商品名・価格・在庫・送料はデモ用のサンプルです。決済、配送、メール送信は行いません。</p><p>実際の商品情報とお買い物は、公式サイトをご利用ください。</p><a className="text-link" href="https://t-shoten.jp/" target="_blank" rel="noreferrer">塚田商店 公式サイト ↗</a></div></div></section>;
}

createRoot(document.getElementById('root')).render(<App />);
