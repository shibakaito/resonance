'use client';
import { useState } from 'react';
import { Search, Tag, Package, Upload, ArrowRight } from 'lucide-react';
import { POPULAR_BRANDS, searchCatalog, searchBrands } from '../data/catalog';

const NO_IMAGE = '/images/no-image.png';
const imgFor = (_model: string) => NO_IMAGE;

interface ListingSearchPageProps {
  onSelect: (data: { title: string; brand?: string; model?: string; year?: string; category?: string }) => void;
}

export function ListingSearchPage({ onSelect }: ListingSearchPageProps) {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) setShowResults(true);
  };

  const filtered = searchCatalog(query, 20);
  const brandMatches = filtered.length === 0 ? searchBrands(query, 6) : [];

  return (
    <main className="max-w-4xl mx-auto px-4 py-16">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-3">판매를 시작하세요</h1>
        <p className="text-gray-600 text-lg">
          판매하실 상품을 검색해서 빠르게 등록하거나, 처음부터 직접 작성할 수 있어요.
        </p>
      </div>

      <form onSubmit={handleSearch} className="relative mb-4 max-w-2xl mx-auto">
        <Search className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim()) setShowResults(true);
            else setShowResults(false);
          }}
          placeholder="브랜드, 모델 또는 키워드를 입력하세요 (예: McIntosh MC152)"
          className="w-full border-2 border-[#e0e0e0] rounded-full pl-14 pr-32 py-4 focus:outline-none focus:border-[#000000] text-base shadow-sm"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#000000] hover:bg-[#000000] text-white px-6 py-2.5 rounded-full font-semibold transition"
        >
          검색
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-center gap-2 mb-12 max-w-2xl mx-auto">
        <span className="text-sm text-gray-500">인기 브랜드:</span>
        {POPULAR_BRANDS.map((b) => (
          <button
            key={b}
            onClick={() => {
              setQuery(b);
              setShowResults(true);
            }}
            className="text-sm px-3 py-1 rounded-full border border-[#e0e0e0] hover:border-gray-500 hover:text-[#000000] hover:bg-[#f7f7f7] transition"
          >
            {b}
          </button>
        ))}
      </div>

      {showResults && (
        <div className="mb-12 max-w-2xl mx-auto">
          <h2 className="text-lg font-bold mb-3">
            "{query}" 에 대한 검색 결과 ({filtered.length})
          </h2>
          <div className="space-y-2">
            {filtered.length > 0 ? (
              filtered.map((r, idx) => (
                <button
                  key={idx}
                  onClick={() =>
                    onSelect({
                      title: `${r.brand} ${r.model}`,
                      brand: r.brand,
                      model: r.model,
                      year: r.year,
                      category: r.category
                    })
                  }
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-[#e0e0e0] hover:border-gray-500 hover:shadow-md transition text-left group"
                >
                  <div className="w-14 h-14 rounded-md bg-[#f7f7f7] overflow-hidden flex-shrink-0">
                    <img src={imgFor(r.model)} alt={r.model} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">
                      {r.brand} {r.model}
                    </p>
                    <p className="text-sm text-gray-600 truncate">
                      {r.year} · {r.category}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#000000] transition flex-shrink-0" />
                </button>
              ))
            ) : (
              <div className="border border-dashed border-[#e0e0e0] rounded-lg p-5">
                <p className="text-gray-600 mb-3 text-center">
                  카탈로그에 일치하는 모델이 없어요.
                </p>
                {brandMatches.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-500 mb-2">관련 브랜드</p>
                    <div className="flex flex-wrap gap-2">
                      {brandMatches.map((b) => (
                        <button
                          key={b.name}
                          onClick={() => onSelect({ title: b.name, brand: b.name })}
                          className="px-3 py-1.5 rounded-full border border-[#e0e0e0] hover:border-gray-500 hover:text-[#000000] hover:bg-[#f7f7f7] text-sm font-semibold transition"
                        >
                          {b.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="text-center">
                  <button
                    onClick={() => onSelect({ title: query })}
                    className="text-[#000000] hover:text-[#000000] font-semibold underline text-sm"
                  >
                    "{query}" 으로 직접 등록하기
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#f7f7f7]/60 via-white to-[#f7f7f7] border border-[#e0e0e0]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[#e0e0e0] flex items-center justify-center">
              <Tag className="w-4 h-4 text-[#000000]" />
            </div>
            <span className="text-xs font-semibold text-gray-500">1단계</span>
          </div>
          <p className="font-bold mb-1">상품 정보 입력</p>
          <p className="text-sm text-gray-600">브랜드, 모델, 연도 같은 키워드로 검색해보세요.</p>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/60 via-white to-[#f7f7f7] border border-[#e0e0e0]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Package className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-xs font-semibold text-gray-500">2단계</span>
          </div>
          <p className="font-bold mb-1">일치하는 카탈로그 선택</p>
          <p className="text-sm text-gray-600">검색 결과에서 내 상품과 일치하는 항목을 선택하세요.</p>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50/60 via-white to-[#f7f7f7] border border-[#e0e0e0]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <Upload className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-xs font-semibold text-gray-500">3단계</span>
          </div>
          <p className="font-bold mb-1">편집 및 등록</p>
          <p className="text-sm text-gray-600">사진과 가격을 추가하고 등록을 완료하세요.</p>
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={() => onSelect({ title: '' })}
          className="text-[#000000] hover:text-[#000000] font-semibold text-sm underline underline-offset-4"
        >
          검색 없이 직접 등록하기
        </button>
      </div>
    </main>
  );
}
