import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-tsukada-darkBurgundy text-[#e0d6c3] text-xs py-12 px-4 border-t border-tsukada-burgundy">
      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8 mb-8">
        <div className="space-y-3">
          <h4 className="text-base font-bold text-white tracking-wider">干し芋屋 塚田商店</h4>
          <p className="leading-relaxed">
            〒308-0000 茨城県筑西市<br />
            茨城県産の紅はるかを専門に扱う干し芋専門店です。
          </p>
        </div>
        <div className="space-y-2 font-sans">
          <h5 className="font-bold text-white mb-3">Shop Menu</h5>
          <p><a href="#" className="hover:underline">特定商取引法に基づく表記</a></p>
          <p><a href="#" className="hover:underline">プライバシーポリシー</a></p>
          <p><a href="#" className="hover:underline">配送・送料について</a></p>
        </div>
        <div className="space-y-2 font-sans">
          <h5 className="font-bold text-white mb-3">Supported Payments</h5>
          <p className="text-gray-400">VISA / MasterCard / JCB / AMEX / Apple Pay</p>
        </div>
      </div>
      <div className="max-w-6xl mx-auto pt-6 border-t border-white/10 text-center font-sans text-gray-400">
        © {new Date().getFullYear()} 塚田商店 (Tsukada Shoten). All Rights Reserved.
      </div>
    </footer>
  );
}