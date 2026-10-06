import React, { useState } from 'react';
import { ShoppingBag, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom'; // 👈 Link import

export default function Header({ cartCount }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <div className="bg-tsukada-burgundy text-white text-xs py-2 text-center tracking-widest px-4">
        【送料無料】茨城県筑西市直送・こだわり契約農家の紅はるか干し芋
      </div>

      <header className="sticky top-0 z-50 bg-tsukada-bgBeige/95 backdrop-blur-sm border-b border-tsukada-burgundy/10">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <button 
            className="md:hidden text-tsukada-burgundy"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <Link to="/" className="inline-block text-center md:text-left no-underline">
            <span className="block text-xs text-tsukada-burgundy tracking-widest font-antique">
              干し芋屋 塚田商店
            </span>
            <h1 className="text-2xl font-bold tracking-wider text-tsukada-burgundy">
              塚 田 商 店
            </h1>
      </Link>

          {/* PC Navigation Bar */}
          <nav className="hidden md:flex space-x-8 text-sm font-medium text-gray-700">
            <Link to="/about" className="hover:text-tsukada-burgundy transition-colors">塚田商店について</Link>
            <Link to="/products" className="hover:text-tsukada-burgundy transition-colors">商品一覧</Link>
            <Link to="/reviews" className="hover:text-tsukada-burgundy transition-colors">お客様の声</Link>
            <Link to="/contact" className="hover:text-tsukada-burgundy transition-colors">お問い合わせ</Link>
          </nav>

          <div className="flex items-center space-x-4 text-tsukada-burgundy">
            <button className="relative p-2 hover:opacity-80">
              <ShoppingBag size={22} />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 bg-tsukada-burgundy text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-sans">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMenuOpen && (
          <nav className="md:hidden border-t border-tsukada-burgundy/10 bg-tsukada-bgBeige px-6 py-4 space-y-3 font-medium">
            <Link to="/about" className="block text-gray-800 hover:text-tsukada-burgundy" onClick={() => setIsMenuOpen(false)}>塚田商店について</Link>
            <Link to="/products" className="block text-gray-800 hover:text-tsukada-burgundy" onClick={() => setIsMenuOpen(false)}>商品一覧</Link>
            <Link to="/reviews" className="block text-gray-800 hover:text-tsukada-burgundy" onClick={() => setIsMenuOpen(false)}>お客様の声</Link>
            <Link to="/contact" className="block text-gray-800 hover:text-tsukada-burgundy" onClick={() => setIsMenuOpen(false)}>お問い合わせ</Link>
          </nav>
        )}
      </header>
    </>
  );
}