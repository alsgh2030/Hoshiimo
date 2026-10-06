import React from 'react';
import { Star } from 'lucide-react';

export default function ProductCard({ product, onAddToCart }) {
  return (
    <div className="bg-white border border-tsukada-burgundy/10 shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between">
      <div>
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          <span className="absolute top-3 left-3 z-10 bg-tsukada-burgundy text-white text-[10px] px-2 py-1 tracking-wider font-sans">
            {product.badge}
          </span>
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        <div className="p-6 space-y-3">
          <div className="flex items-center space-x-1 text-tsukada-burgundy">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={14} fill="#680c0c" stroke="none" />
            ))}
            <span className="text-xs font-sans text-gray-500 ml-2">
              {product.rating} ({product.reviews})
            </span>
          </div>
          <h3 className="font-bold text-base text-gray-900 leading-snug">{product.name}</h3>
          <p className="text-xs text-gray-500 font-sans">{product.subName}</p>
        </div>
      </div>
      <div className="px-6 pb-6 pt-2 flex items-center justify-between border-t border-gray-100">
        <span className="text-lg font-bold text-tsukada-burgundy font-sans">
          ￥{product.price.toLocaleString()}
        </span>
        <button
          onClick={() => onAddToCart(product)}
          className="bg-tsukada-bgBeige text-tsukada-burgundy border border-tsukada-burgundy px-4 py-2 text-xs hover:bg-tsukada-burgundy hover:text-white transition-colors font-sans"
        >
          カートに追加
        </button>
      </div>
    </div>
  );
}