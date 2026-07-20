import { Link } from '@tanstack/react-router';
import {
  ArrowLeft,
  Bone,
  Check,
  ImageIcon,
  MapPin,
  PackageCheck,
  PawPrint,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
} from 'lucide-react';
import { useMemo, useState, type SyntheticEvent } from 'react';

import { PublicHeader } from '@/components/public-header';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useProducts, type ProductResponse } from '@/features/products/api';
import { formatVnd } from '@/features/billing/format';

const ALL_CATEGORIES = 'Tất cả';

const STORE_HERO_IMAGE = '/images/store/store-hero.jpg';
const STORE_FALLBACK_IMAGE = '/images/store/product-fallback.jpg';

const PRODUCT_IMAGES_BY_CODE: Readonly<Record<string, string>> = {
  MCH_TOY_BALL: '/images/store/mch-toy-ball.jpg',
  MCH_TOY_MOUSE: '/images/store/mch-toy-mouse.jpg',
  MCH_FOOD_DOG: '/images/store/mch-food-dog.jpg',
  MCH_FOOD_CAT: '/images/store/mch-food-cat.jpg',
  MCH_LEASH: '/images/store/mch-leash.jpg',
  MCH_COLLAR: '/images/store/mch-collar.jpg',
  MCH_SHAMPOO: '/images/store/mch-shampoo.jpg',
  MCH_DOG_RAINCOAT_M: '/images/store/mch-dog-raincoat-m.jpg',
  MCH_TREAT_CAT: '/images/store/mch-treat-cat.jpg',
  MCH_TREAT_DOG: '/images/store/mch-treat-dog.jpg',
  MCH_BOWL_STEEL: '/images/store/mch-bowl-steel.jpg',
  MCH_LITTER: '/images/store/mch-litter.jpg',
  MCH_CAT_GRASS: '/images/store/mch-cat-grass.jpg',
  MCH_HARNESS_M: '/images/store/mch-harness-m.jpg',
  MCH_DENTAL_CHEW: '/images/store/mch-dental-chew.jpg',
  MCH_TOOTHPASTE: '/images/store/mch-toothpaste.jpg',
  MCH_CARRIER_S: '/images/store/mch-carrier-s.jpg',
  MCH_BRUSH: '/images/store/mch-brush.jpg',
  MCH_PEE_PAD: '/images/store/mch-pee-pad.jpg',
};

function productImage(product: ProductResponse): string | undefined {
  return PRODUCT_IMAGES_BY_CODE[product.code ?? ''];
}

function useFallbackImage(event: SyntheticEvent<HTMLImageElement>) {
  event.currentTarget.onerror = null;
  event.currentTarget.src = STORE_FALLBACK_IMAGE;
}

function StoreProductImage({ product }: { product: ProductResponse }) {
  const image = productImage(product);
  const productName = product.name ?? 'Sản phẩm thú cưng';

  if (!image) {
    return (
      <div
        role="img"
        aria-label={`Chưa có ảnh cho ${productName}`}
        className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-violet-100 via-white to-teal-100 p-6 text-center text-slate-500"
      >
        <ImageIcon className="size-10 text-violet-400" />
        <span className="line-clamp-2 text-sm font-bold">{productName}</span>
      </div>
    );
  }

  return (
    <img
      src={image}
      alt={productName}
      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
      width={1456}
      height={1088}
      loading="lazy"
      decoding="async"
      onError={useFallbackImage}
    />
  );
}

export function StorePage() {
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORIES);
  const [query, setQuery] = useState('');
  const productsQuery = useProducts({
    type: 'MERCHANDISE',
    active: true,
    pageable: { page: 0, size: 200, sort: ['name,asc'] },
  });
  const products = productsQuery.data?.content;

  const categories = useMemo(() => {
    const productCategories = (products ?? [])
      .map((product) => product.category?.trim())
      .filter((category): category is string => Boolean(category));

    return [
      ALL_CATEGORIES,
      ...Array.from(new Set(productCategories)).sort((left, right) =>
        left.localeCompare(right, 'vi'),
      ),
    ];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return (products ?? []).filter((product) => {
      const inCategory =
        activeCategory === ALL_CATEGORIES || product.category === activeCategory;
      const inSearch = (product.name ?? '').toLowerCase().includes(query.toLowerCase());
      return inCategory && inSearch;
    });
  }, [activeCategory, products, query]);

  return (
    <div className="min-h-screen bg-[#FAFAFF] text-slate-900">
      <PublicHeader position="sticky" activePage="store" />

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
                <MapPin className="mr-2 size-4" />
                Chỉ bán trực tiếp tại cửa hàng
              </div>

              <h1 className="max-w-3xl text-4xl leading-tight font-black text-slate-950 md:text-6xl">
                Xem trước sản phẩm, mua trực tiếp tại cửa hàng
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
                Tra cứu sản phẩm, giá và tình trạng tồn kho trước khi ghé PetClinic.
                Website không nhận đặt hàng hoặc thanh toán trực tuyến.
              </p>

              <div className="mt-8 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { icon: Store, label: 'Mua trực tiếp tại quầy' },
                  { icon: PackageCheck, label: 'Tra cứu tồn kho' },
                  { icon: ShieldCheck, label: 'Nhân viên tư vấn' },
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
                  src={STORE_HERO_IMAGE}
                  alt="Đồ dùng và thú cưng trong cửa hàng"
                  className="h-full w-full object-cover"
                  width={1456}
                  height={1088}
                  fetchPriority="high"
                  onError={useFallbackImage}
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
              {productsQuery.isPending ? (
                <div
                  role="status"
                  className="col-span-full rounded-[28px] border border-slate-100 bg-white px-6 py-12 text-center font-semibold text-slate-500"
                >
                  Đang tải sản phẩm tại cửa hàng...
                </div>
              ) : null}

              {productsQuery.isError ? (
                <div
                  role="alert"
                  className="col-span-full rounded-[28px] border border-rose-100 bg-rose-50 px-6 py-12 text-center"
                >
                  <p className="font-bold text-rose-700">
                    Không thể tải danh sách sản phẩm.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4 rounded-full"
                    onClick={() => void productsQuery.refetch()}
                  >
                    Thử lại
                  </Button>
                </div>
              ) : null}

              {!productsQuery.isPending &&
              !productsQuery.isError &&
              filteredProducts.length === 0 ? (
                <div className="col-span-full rounded-[28px] border border-slate-100 bg-white px-6 py-12 text-center font-semibold text-slate-500">
                  Không tìm thấy sản phẩm phù hợp.
                </div>
              ) : null}

              {!productsQuery.isPending &&
                !productsQuery.isError &&
                filteredProducts.map((product) => (
                  <article
                    key={product.id ?? product.code ?? product.name}
                    className="group overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-100/60"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                      <StoreProductImage product={product} />
                      <span className="absolute top-4 left-4 rounded-full bg-white px-3 py-1 text-xs font-black text-violet-700 shadow-sm">
                        {product.stockStatus === 'OUT'
                          ? 'Hết hàng'
                          : product.stockStatus === 'LOW'
                            ? 'Sắp hết'
                            : 'Còn hàng'}
                      </span>
                    </div>

                    <div className="p-5">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">
                          {product.category}
                        </span>
                        <span className="text-sm font-bold text-slate-500">
                          Còn {product.stockQuantity ?? 0} {product.unit ?? ''}
                        </span>
                      </div>

                      <h3 className="min-h-14 text-base leading-snug font-black text-slate-900">
                        {product.name}
                      </h3>
                      <p className="mt-2 text-sm font-semibold text-slate-500">
                        {product.description ?? 'Sản phẩm được cung cấp bởi PetClinic.'}
                      </p>

                      <div className="mt-4 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-xl font-black text-violet-600">
                            {formatVnd(product.unitPrice)}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-slate-400">
                            Giá tham khảo tại cửa hàng
                          </p>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-950 px-3 py-2 text-xs font-bold text-white">
                          <Store className="size-3.5" />
                          Tại quầy
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
            </div>

            <div className="mt-12 grid grid-cols-1 gap-4 rounded-[32px] bg-slate-950 p-6 text-white md:grid-cols-3">
              {[
                'Tư vấn chọn thức ăn theo tuổi và giống trực tiếp tại quầy',
                'Ưu đãi và combo được áp dụng tại cửa hàng',
                'Sản phẩm được mua và thanh toán trực tiếp tại PetClinic',
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
