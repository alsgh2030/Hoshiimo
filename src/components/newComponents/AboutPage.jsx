import React from 'react';

const AboutPage = () => {
  return (
    <div className="about-page" style={{ padding: '40px 20px', maxWidth: '1000px', margin: '0 auto', color: '#333' }}>
      {/* 1. Hero / Header Section */}
      <section className="about-hero" style={{ textAlign: 'center', marginBottom: '60px' }}>
        <p style={{ color: '#680c0c', fontWeight: 'bold', letterSpacing: '0.1em' }}>
          茨城県の干し芋屋 (이바라키현의 호시이모 전문점)
        </p>
        <h1 style={{ fontSize: '2.2rem', margin: '10px 0 20px', fontFamily: 'serif' }}>
          塚田商店について (츠카다 상점 소개)
        </h1>
        <p style={{ lineHeight: '1.8', color: '#555', maxWidth: '700px', margin: '0 auto' }}>
          50년 이상의 정성과 노하우로 만든 이바라키현의 명품 말린 고구마를 전해드립니다.
        </p>
      </section>

      {/* 2. Brand Story Section */}
      <section className="about-story" style={{ marginBottom: '60px', backgroundColor: '#f5f2e7', padding: '40px', borderRadius: '8px' }}>
        <h2 style={{ color: '#680c0c', borderBottom: '2px solid #680c0c', paddingBottom: '10px', marginBottom: '20px' }}>
          Our Story
        </h2>
        <p style={{ lineHeight: '1.9', fontSize: '1rem' }}>
          츠카다 상점은 <strong>1964년(쇼와 39년) 3월 9일</strong>, 이바라키의 작은 슈퍼마켓으로 시작되었습니다. 
          50년이 넘는 세월 동안 쌓아온 상품 지식과 철저한 품질 관리 경험을 바탕으로, 
          현재는 말린 고구마(干し芋) 전문 제조 브랜드로 자리매김하였습니다.
        </p>
        <p style={{ lineHeight: '1.9', fontSize: '1rem', marginTop: '15px' }}>
          고객에게 최고로 맛있는 말린 고구마를 전해드리기 위해 당도 숙성 방식과 제조 공정을 
          매일 연구하며 끊임없이 개선해 나가고 있습니다.
        </p>
      </section>

      {/* 3. Core Values / Features Section */}
      <section className="about-features" style={{ marginBottom: '60px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '40px', color: '#333' }}>
          塚田商店のこだわり (츠카다 상점의 고집)
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          
          {/* Feature 1 */}
          <div style={{ border: '1px solid #ddd', padding: '25px', borderRadius: '8px', textAlign: 'center' }}>
            <h3 style={{ color: '#680c0c', marginBottom: '15px' }}>계약 농가의 엄선된 고구마</h3>
            <p style={{ lineHeight: '1.7', color: '#666', fontSize: '0.95rem' }}>
              이바라키현 내 계약 농가가 토양 만들기부터 정성을 다해 키운 신선하고 질 좋은 고구마만을 엄선하여 사용합니다.
            </p>
          </div>

          {/* Feature 2 */}
          <div style={{ border: '1px solid #ddd', padding: '25px', borderRadius: '8px', textAlign: 'center' }}>
            <h3 style={{ color: '#680c0c', marginBottom: '15px' }}>독자적인 숙성 & 제조 공정</h3>
            <p style={{ lineHeight: '1.7', color: '#666', fontSize: '0.95rem' }}>
              고구마 본연의 단맛을 극대화하기 위해 당도 숙성법과 가공 방식을 끊임없이 개선하고 연구합니다.
            </p>
          </div>

          {/* Feature 3 */}
          <div style={{ border: '1px solid #ddd', padding: '25px', borderRadius: '8px', textAlign: 'center' }}>
            <h3 style={{ color: '#680c0c', marginBottom: '15px' }}>50년 유산과 정성</h3>
            <p style={{ lineHeight: '1.7', color: '#666', fontSize: '0.95rem' }}>
              오랜 세월 다져진 엄격한 상품 관리 기법을 통해 안심하고 드실 수 있는 바른 먹거리를 전달합니다.
            </p>
          </div>

        </div>
      </section>

      {/* 4. Store Info Footer Summary */}
      <section className="about-info" style={{ textAlign: 'center', paddingTop: '30px', borderTop: '1px solid #eee' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>茨城県の干し芋屋 塚田商店</h3>
        <p style={{ color: '#777', fontSize: '0.9rem' }}>
          공식 사이트: https://t-shoten.jp
        </p>
      </section>
    </div>
  );
};

export default AboutPage;