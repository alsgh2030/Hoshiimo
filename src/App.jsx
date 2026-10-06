import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
import ProductList from './components/ProductList';
import Footer from './components/Footer';
import { products } from './data/products';
import AboutPage from './components/newComponents/AboutPage';
import ProductPage from './components/newComponents/ProductPage';
import ReviewsPage from './components/newComponents/ReviewsPage';
import ContactPage from './components/newComponents/ContactPage';

export default function App() {
  const [cartItems, setCartItems] = useState([]);

  const handleAddToCart = (product) => {
    setCartItems((prev) => [...prev, product]);
    alert(`${product.name}이(가) 장바구니에 담겼습니다.`);
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-tsukada-bgBeige text-[#333333] font-mincho">
        <Header cartCount={cartItems.length} />
        
        <main>
          <Routes>
            {/* 메인 홈 화면 */}
            <Route path="/" element={
              <>
                <Hero />
                <ProductList products={products} onAddToCart={handleAddToCart} />
              </>
            } />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/products" element={<ProductPage products={products} onAddToCart={handleAddToCart} />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/contact" element={<ContactPage />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </BrowserRouter>
  );
}