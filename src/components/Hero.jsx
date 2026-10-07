import React from 'react';
import { ChevronRight } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative bg-tsukada-heroBeige py-20 md:py-32 px-4 overflow-hidden border-b border-tsukada-burgundy/10">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6 text-center md:text-left z-10">
          <span className="inline-block border border-tsukada-burgundy text-tsukada-burgundy text-xs px-3 py-1 tracking-widest">
            茨城県筑西市産
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-tsukada-burgundy leading-tight tracking-wider">
            自然の甘み、<br />
            極上の「紅はるか」
          </h2>
          <p className="text-sm md:text-base text-gray-700 leading-relaxed font-sans">
            농가에서 정성껏 재배하여 엄선한 이바라키현 베니하루카 고구마만을 사용합니다.<br />
            쫀득한 식감과 깊은 단맛을 느껴보세요.
          </p>
          <div className="pt-4">
            <a
              href="#products"
              className="inline-flex items-center justify-center bg-tsukada-burgundy text-black px-8 py-4 text-sm tracking-widest hover:bg-tsukada-hoverBurgundy transition-colors shadow-sm"
            >
              商品を見る <ChevronRight size={16} className="ml-2" />
            </a>
          </div>
        </div>
        <div className="relative flex justify-center">
          <div className="w-72 h-72 md:w-96 md:h-96 rounded-full overflow-hidden border-4 border-tsukada-burgundy/20 shadow-xl">
            <img
              src="https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=600"
              alt="塚田商店 干し芋"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}