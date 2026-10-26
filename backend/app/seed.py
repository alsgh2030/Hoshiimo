import asyncio

from sqlalchemy import select

from app.db.database import SessionLocal, async_engine
from app.db.models import Product

# Original demo descriptions and prices, not a copy of the shop's current inventory.
PRODUCTS = [
    ('beniharuka-premium-300', '紅はるか 特選平干し', 'ゆっくり味わいたい、やわらかな甘み。お茶の時間にぴったりの一袋です。', 'premium', 300, 1480, 32),
    ('beniharuka-standard-500', '紅はるか おうちの干し芋', '毎日のおやつに。家族で分けやすいたっぷりサイズの平干しです。', 'standard', 500, 1980, 48),
    ('beniharuka-value-1000', '紅はるか お楽しみパック', '形や大きさはふぞろい。気軽に楽しめる、お得なデモ商品です。', 'value', 1000, 2680, 20),
    ('beniharuka-offcuts-400', '紅はるか ひとくち切り落し', 'ちいさく食べやすい切り落し。ヨーグルトやアイスのトッピングにも。', 'offcuts', 400, 1280, 15),
    ('beniharuka-premium-600', '紅はるか 特選たっぷり便', 'しっとりとした食感を、もう少し。特選平干しの大きなパックです。', 'premium', 600, 2780, 8),
    ('beniharuka-standard-250', '紅はるか はじめての一袋', '干し芋を初めて食べる方にも。小さなサイズで気軽にお試しいただけます。', 'standard', 250, 1080, 24),
]


async def main():
    async with SessionLocal() as db:
        for slug, name, description, category, weight, price, stock in PRODUCTS:
            if not await db.scalar(select(Product.id).where(Product.slug == slug)):
                db.add(Product(slug=slug, name=name, description=description, category=category,
                               weight_g=weight, price_yen=price, stock=stock))
        await db.commit()
    await async_engine.dispose()
    print('Demo products are ready. Existing products were not overwritten.')


if __name__ == '__main__':
    asyncio.run(main())
