import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';

export const yen = value => new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
export const categories = { premium: '特選品', standard: '標準品', value: '訳あり品', offcuts: '切り落し' };
export const statuses = { placed: '受付済み', packed: '梱包済み', shipped: '発送済み', cancelled: 'キャンセル' };

export function ProductPhoto({ product, eager = false }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [product.image_url]);
  if (!product.image_url || failed) return <PackageArt category={product.category} />;
  return <img className="product-photo" src={product.image_url} alt={product.name}
    width="800" height="800" loading={eager ? 'eager' : 'lazy'} decoding="async"
    onError={() => setFailed(true)} />;
}

export function Modal({ title, onClose, children, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = old; };
  }, []);
  return <dialog ref={ref} className={`modal ${wide ? 'wide' : ''}`} onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={e => { if (e.target === ref.current) onClose(); }} aria-labelledby="dialog-title">
    <div className="modal-heading"><h2 id="dialog-title">{title}</h2><button className="icon-button" onClick={onClose} aria-label="閉じる"><X size={22} /></button></div>
    {children}
  </dialog>;
}

export function PackageArt({ category = 'premium', variant = 0, hero = false }) {
  const tones = { premium: '#653747', standard: '#596746', value: '#ad7039', offcuts: '#526b72' };
  const tone = tones[category] || tones.premium;
  return <div className={`package-art ${hero ? 'hero-art' : ''}`} aria-hidden="true">
    <svg viewBox="0 0 420 460" role="presentation">
      <ellipse cx="210" cy="407" rx="122" ry="19" fill="#5d3a2a" opacity=".09" />
      <g transform={`rotate(${variant % 2 ? 5 : -5} 210 220)`}>
        <path d="M107 64 L313 64 L326 389 Q213 411 94 389 Z" fill="#e1cb9d" stroke="#c8b484" strokeWidth="2" />
        <path d="M110 77 H310 M109 85 H311" stroke="#bba271" strokeWidth="3" />
        <path d="M117 102 H303 L311 367 Q210 386 105 367 Z" fill="#f1ddaf" />
        <path d="M126 247 C139 201 159 215 166 248 L175 329 Q158 360 137 335 Z" fill="#cd912d" />
        <path d="M180 242 C182 199 210 198 218 240 L227 342 Q199 361 183 335 Z" fill="#dfae47" />
        <path d="M238 243 C242 206 265 203 273 238 L288 324 Q268 354 245 336 Z" fill="#d69b36" />
        <path d="M144 239 L155 325 M199 231 L207 337 M257 233 L269 329" stroke="#f0ca68" strokeWidth="5" opacity=".6" strokeLinecap="round" />
        <rect x="133" y="112" width="154" height="127" rx="1" fill="#fffaf0" />
        <circle cx="210" cy="147" r="19" fill="none" stroke={tone} strokeWidth="1.2" />
        <path d="M202 138 Q218 138 217 153 Q203 159 202 138 M209 139 L211 153" fill="none" stroke={tone} strokeWidth="1.5" />
        <text x="210" y="191" textAnchor="middle" fill={tone} fontSize="24" fontFamily="serif" letterSpacing="5">ほしいも</text>
        <text x="210" y="215" textAnchor="middle" fill="#6d6554" fontSize="9" letterSpacing="3">HOSHIIMO · DEMO</text>
        <rect x="133" y="231" width="154" height="8" fill={tone} />
        <path d="M107 381 Q210 399 315 381" stroke="#bda573" fill="none" strokeWidth="2" />
      </g>
    </svg>
  </div>;
}

export function Empty({ title, children, action }) {
  return <div className="empty"><span className="empty-mark">芋</span><h3>{title}</h3><p>{children}</p>{action}</div>;
}

export function ErrorBox({ message, retry }) {
  if (!message) return null;
  return <div className="error-box" role="alert"><span>{message}</span>{retry && <button className="text-button" onClick={retry}>再試行</button>}</div>;
}

export function Pager({ page, total, pageSize, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages < 2) return null;
  return <nav className="pager" aria-label="ページ切り替え">
    <button className="icon-button" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="前のページ"><ArrowLeft size={18} /></button>
    <span>{page} / {pages}</span>
    <button className="icon-button" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="次のページ"><ArrowRight size={18} /></button>
  </nav>;
}
