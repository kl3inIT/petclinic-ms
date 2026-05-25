import { Link, createFileRoute } from '@tanstack/react-router';
import {
  ArrowLeft,
  Bone,
  Check,
  Heart,
  PackageCheck,
  PawPrint,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Star,
  Truck,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/store')({
  component: StorePage,
});

const categories = ['Tất cả', 'Thức ăn', 'Đồ chơi', 'Phụ kiện', 'Chăm sóc'];

const products = [
  {
    name: 'Hạt dinh dưỡng Puppy Balance',
    category: 'Thức ăn',
    price: '320.000đ',
    oldPrice: '380.000đ',
    rating: 4.9,
    sold: '1.2k',
    tag: 'Bán chạy',
    image:
      'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=700&q=80&auto=format&fit=crop',
  },
  {
    name: 'Pate cá hồi cho mèo nhạy cảm',
    category: 'Thức ăn',
    price: '42.000đ',
    oldPrice: '55.000đ',
    rating: 4.8,
    sold: '860',
    tag: 'Mới',
    image:
      'https://images.unsplash.com/photo-1601758125946-6ec2ef64daf8?w=700&q=80&auto=format&fit=crop',
  },
  {
    name: 'Bóng nhai cao su tự nhiên',
    category: 'Đồ chơi',
    price: '95.000đ',
    oldPrice: '120.000đ',
    rating: 4.7,
    sold: '540',
    tag: 'Bền',
    image:
      'https://images.unsplash.com/photo-1601758174114-e711c0cbaa69?w=700&q=80&auto=format&fit=crop',
  },
  {
    name: 'Dây kéo co cotton cho chó',
    category: 'Đồ chơi',
    price: '115.000đ',
    oldPrice: '145.000đ',
    rating: 4.8,
    sold: '410',
    tag: 'Vận động',
    image:
      'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=700&q=80&auto=format&fit=crop',
  },
  {
    name: 'Vòng cổ phản quang Premium',
    category: 'Phụ kiện',
    price: '180.000đ',
    oldPrice: '230.000đ',
    rating: 4.9,
    sold: '690',
    tag: 'An toàn',
    image:
      'https://images.unsplash.com/photo-1583511655826-05700442b31b?w=700&q=80&auto=format&fit=crop',
  },
  {
    name: 'Balo vận chuyển thú cưng',
    category: 'Phụ kiện',
    price: '650.000đ',
    oldPrice: '720.000đ',
    rating: 4.8,
    sold: '230',
    tag: 'Du lịch',
    image:
      'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=700&q=80&auto=format&fit=crop',
  },
  {
    name: 'Sữa tắm dịu nhẹ da nhạy cảm',
    category: 'Chăm sóc',
    price: '210.000đ',
    oldPrice: '260.000đ',
    rating: 4.7,
    sold: '350',
    tag: 'Spa',
    image:
      'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=700&q=80&auto=format&fit=crop',
  },
  {
    name: 'Lược gỡ rối lông hai lớp',
    category: 'Chăm sóc',
    price: '155.000đ',
    oldPrice: '190.000đ',
    rating: 4.8,
    sold: '480',
    tag: 'Grooming',
    image:
      'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=700&q=80&auto=format&fit=crop',
  },
];

function StorePage() {
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [query, setQuery] = useState('');
  const [cartCount, setCartCount] = useState(0);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const inCategory =
        activeCategory === 'Tất cả' || product.category === activeCategory;
      const inSearch = product.name.toLowerCase().includes(query.toLowerCase());
      return inCategory && inSearch;
    });
  }, [activeCategory, query]);

  return (
    <div className="min-h-screen bg-[#FAFAFF] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <Logo size="sm" />
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 md:flex">
            <a href="/#services" className="hover:text-violet-600">
              Dịch vụ
            </a>
            <a href="/#pricing" className="hover:text-violet-600">
              Bảng giá
            </a>
            <a href="/#testimonials" className="hover:text-violet-600">
              Đánh giá
            </a>
          </nav>

          <Button className="rounded-full bg-violet-600 font-bold hover:bg-violet-700">
            <ShoppingCart className="size-4" />
            Giỏ hàng ({cartCount})
          </Button>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-white px-6 py-16 lg:px-8 lg:py-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(20,184,166,0.12),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(124,58,237,0.14),transparent_28%)]" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <Button asChild variant="ghost" className="mb-6 rounded-full">
                <Link to="/">
                  <ArrowLeft className="size-4" />
                  Về trang chủ
                </Link>
              </Button>

              <div className="mb-5 inline-flex items-center rounded-full border border-violet-100 bg-violet-50 px-4 py-2 text-sm font-bold text-violet-700">
                <ShoppingBag className="mr-2 size-4" />
                Cửa hàng đồ dùng thú cưng
              </div>

              <h1 className="max-w-3xl text-4xl leading-tight font-black text-slate-950 md:text-6xl">
                Mua nhanh đồ ăn, đồ chơi và phụ kiện cho pet
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
                Dữ liệu mẫu cho cửa hàng: sản phẩm thiết yếu, giá tham khảo, danh mục rõ
                ràng và thao tác thêm giỏ hàng ngay trên trang.
              </p>

              <div className="mt-8 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { icon: Truck, label: 'Giao nhanh 2h' },
                  { icon: ShieldCheck, label: 'Hàng chọn lọc' },
                  { icon: PackageCheck, label: 'Đổi trả 7 ngày' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm"
                  >
                    <item.icon className="size-5 text-teal-600" />
                    <span className="text-sm font-bold text-slate-700">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="aspect-[4/3] overflow-hidden rounded-[36px] border-8 border-white shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1601758123927-196f63d5a15c?w=1000&q=80&auto=format&fit=crop"
                  alt="Đồ dùng và thú cưng trong cửa hàng"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 left-6 rounded-3xl bg-slate-950 px-5 py-4 text-white shadow-xl">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <Sparkles className="size-4 text-amber-300" />
                  Combo chăm sóc tháng này
                </div>
                <p className="mt-1 text-2xl font-black">-20%</p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 py-10 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-bold tracking-widest text-violet-600 uppercase">
                  Danh mục sản phẩm
                </p>
                <h2 className="mt-2 text-3xl font-black text-slate-950">
                  Chọn món phù hợp cho bé
                </h2>
              </div>

              <label className="flex w-full items-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-3 shadow-sm lg:w-[360px]">
                <Search className="size-5 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Tìm đồ ăn, đồ chơi, phụ kiện..."
                  className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
                />
              </label>
            </div>

            <div className="mb-8 flex gap-3 overflow-x-auto pb-2">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-2 rounded-full border px-5 py-3 text-sm font-bold transition',
                    activeCategory === category
                      ? 'border-violet-600 bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-600',
                  )}
                >
                  {category === 'Đồ chơi' ? (
                    <Bone className="size-4" />
                  ) : (
                    <PawPrint className="size-4" />
                  )}
                  {category}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {filteredProducts.map((product) => (
                <article
                  key={product.name}
                  className="group overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-100/60"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <span className="absolute top-4 left-4 rounded-full bg-white px-3 py-1 text-xs font-black text-violet-700 shadow-sm">
                      {product.tag}
                    </span>
                    <button
                      type="button"
                      className="absolute top-4 right-4 grid size-9 place-items-center rounded-full bg-white text-slate-500 shadow-sm transition hover:text-rose-500"
                    >
                      <Heart className="size-4" />
                    </button>
                  </div>

                  <div className="p-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">
                        {product.category}
                      </span>
                      <span className="flex items-center gap-1 text-sm font-bold text-amber-500">
                        <Star className="size-4 fill-current" />
                        {product.rating}
                      </span>
                    </div>

                    <h3 className="min-h-14 text-base leading-snug font-black text-slate-900">
                      {product.name}
                    </h3>
                    <p className="mt-2 text-sm font-semibold text-slate-500">
                      Đã bán {product.sold}
                    </p>

                    <div className="mt-4 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-xl font-black text-violet-600">
                          {product.price}
                        </p>
                        <p className="text-sm font-semibold text-slate-400 line-through">
                          {product.oldPrice}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        className="rounded-full bg-slate-950 hover:bg-violet-600"
                        onClick={() => setCartCount((count) => count + 1)}
                      >
                        <ShoppingCart className="size-4" />
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-12 grid grid-cols-1 gap-4 rounded-[32px] bg-slate-950 p-6 text-white md:grid-cols-3">
              {[
                'Tư vấn chọn thức ăn theo tuổi và giống',
                'Có combo đồ chơi giảm stress cho chó mèo',
                'Có thể kết nối đơn hàng với lịch khám tại phòng khám',
              ].map((text) => (
                <div key={text} className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-teal-400 text-slate-950">
                    <Check className="size-4" />
                  </span>
                  <p className="text-sm leading-relaxed font-semibold text-slate-200">
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
