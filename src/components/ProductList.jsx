import React from 'react';
import ProductCard from './ProductCard';

export default function ProductList({ products, onAddToCart }) {
  return (
    <section id="products" className="max-w-6xl mx-auto px-4 py-20">
      <div className="text-center mb-16 space-y-2">
        <span className="text-xs text-tsukada-burgundy tracking-widest font-sans uppercase">Products</span>
        <h2 className="text-2xl md:text-3xl font-bold text-tsukada-burgundy tracking-wider">RECOMMENDED ITEMS</h2>
        <div className="w-12 h-0.5 bg-tsukada-burgundy mx-auto mt-4"></div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} onAddToCart={onAddToCart} />
        ))}
      </div>
    </section>
  );
}