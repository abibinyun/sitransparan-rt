import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, NavLink } from 'react-router-dom';
import {
  Search,
  BookOpen,
  ChevronRight,
  ChevronDown,
  Clock,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Info,
  CheckCircle2,
  Menu,
  X,
  ShieldCheck,
  Users,
  Wallet,
  Calendar,
  Flame,
  MessageSquareHeart,
  HelpCircle,
  LucideIcon,
} from 'lucide-react';
import {
  adminDocCategories,
  getAllArticles,
  getArticleBySlug,
  DocArticle,
} from '../data/adminDocsData';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';

const iconMap: Record<string, LucideIcon> = {
  ShieldCheck,
  Users,
  Wallet,
  Calendar,
  Flame,
  MessageSquareHeart,
};

export const AdminDocsPage: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();

  const allArticles = useMemo(() => getAllArticles(), []);

  // Resolusi artikel aktif berbasis URL slug atau artikel pertama
  const activeArticle: DocArticle = useMemo(() => {
    if (slug) {
      const found = getArticleBySlug(slug);
      if (found) return found;
    }
    return allArticles[0];
  }, [slug, allArticles]);

  const [searchQuery, setSearchQuery] = useState('');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const toggleCategoryCollapse = (catId: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // Filter kategori dan artikel berbasis pencarian
  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return adminDocCategories;

    return adminDocCategories
      .map((cat) => {
        const matchingArticles = cat.articles.filter((art) => {
          const matchTitle = art.title.toLowerCase().includes(q);
          const matchExcerpt = art.excerpt.toLowerCase().includes(q);
          const matchCategory = art.category.toLowerCase().includes(q);
          const matchSection = art.sections.some(
            (s) =>
              s.heading.toLowerCase().includes(q) ||
              s.content.some((c) => c.toLowerCase().includes(q)) ||
              (s.steps && s.steps.some((st) => st.title.toLowerCase().includes(q) || st.description.toLowerCase().includes(q)))
          );
          return matchTitle || matchExcerpt || matchCategory || matchSection;
        });

        return {
          ...cat,
          articles: matchingArticles,
        };
      })
      .filter((cat) => cat.articles.length > 0);
  }, [searchQuery]);

  // Navigasi artikel sebelumnya & selanjutnya
  const currentIdx = allArticles.findIndex((a) => a.slug === activeArticle.slug);
  const prevArticle = currentIdx > 0 ? allArticles[currentIdx - 1] : null;
  const nextArticle = currentIdx < allArticles.length - 1 ? allArticles[currentIdx + 1] : null;

  return (
    <div className="space-y-4">
      {/* Header Bar Modul Dokumentasi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-[#d2d2d7] rounded-xl shadow-xs overflow-hidden">
        <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
          <div className="p-2.5 bg-blue-50 text-[#0071e3] rounded-xl border border-blue-100 shrink-0">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-xl font-bold tracking-tight text-[#1d1d1f] break-words">
                Buku Panduan &amp; SOP Pengurus RT
              </h1>
              <Badge variant="outline" className="text-[10px] bg-[#f4f8fb] text-[#0066cc] border-[#d2d2d7] shrink-0">
                Laravel Style Docs
              </Badge>
            </div>
            <p className="text-xs text-[#707070] mt-0.5 line-clamp-2">
              Pedoman operasional transparansi kependudukan, iuran, multi-fund, dan bank sampah.
            </p>
          </div>
        </div>

        {/* Search Bar Instan */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#707070]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari panduan (mis: QR, iuran, kas)..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-[#d2d2d7] bg-[#f5f5f7] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0071e3] transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#707070] hover:text-[#1d1d1f]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Drawer Trigger (< 1024px) */}
      <div className="lg:hidden">
        <Button
          variant="outline"
          onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
          className="w-full justify-between border-[#d2d2d7] bg-white text-xs font-semibold text-[#1d1d1f] gap-2 overflow-hidden"
        >
          <span className="flex items-center gap-2 shrink-0">
            <Menu className="h-4 w-4 text-[#0071e3]" /> Daftar Topik Panduan
          </span>
          <span className="text-[11px] text-[#707070] truncate max-w-[160px] text-right">
            {activeArticle.title}
          </span>
        </Button>
      </div>

      {/* Main 2-Column Documentation Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* SIDEBAR DAFTAR ISI (Sticky on desktop, drawer on mobile) */}
        <aside
          className={`${
            mobileDrawerOpen ? 'block' : 'hidden'
          } lg:block lg:col-span-4 bg-white border border-[#d2d2d7] rounded-xl shadow-xs p-3.5 space-y-3 lg:sticky lg:top-20 max-h-[82vh] overflow-y-auto`}
        >
          <div className="flex items-center justify-between pb-2 border-b border-[#f0f0f2]">
            <span className="text-xs font-bold uppercase tracking-wider text-[#707070]">Daftar Panduan</span>
            <span className="text-[11px] text-[#707070] font-mono">{allArticles.length} artikel</span>
          </div>

          {filteredCategories.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#707070] space-y-1">
              <HelpCircle className="h-6 w-6 text-[#858585] mx-auto" />
              <p className="font-semibold text-[#1d1d1f]">Tidak ada panduan ditemukan</p>
              <p>Coba kata kunci lain atau bersihkan pencarian.</p>
            </div>
          ) : (
            filteredCategories.map((cat) => {
              const IconComp = iconMap[cat.iconName] || BookOpen;
              const isCollapsed = collapsedCategories[cat.id];

              return (
                <div key={cat.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleCategoryCollapse(cat.id)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold text-[#1d1d1f] hover:bg-[#f5f5f7] transition"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <IconComp className="h-4 w-4 text-[#0071e3] shrink-0" />
                      <span className="truncate">{cat.name}</span>
                    </div>
                    {isCollapsed ? (
                      <ChevronRight className="h-3.5 w-3.5 text-[#707070] shrink-0" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-[#707070] shrink-0" />
                    )}
                  </button>

                  {!isCollapsed && (
                    <ul className="pl-6 space-y-0.5 border-l-2 border-[#e5e5ea] ml-3.5 text-xs">
                      {cat.articles.map((art) => {
                        const isActive = art.slug === activeArticle.slug;

                        return (
                          <li key={art.slug}>
                            <button
                              type="button"
                              onClick={() => {
                                navigate(`/admin/panduan/${art.slug}`);
                                setMobileDrawerOpen(false);
                              }}
                              className={`w-full text-left py-1.5 px-2.5 rounded-md transition text-xs flex items-center justify-between gap-1.5 ${
                                isActive
                                  ? 'bg-[#f4f8fb] text-[#0066cc] font-bold border-l-2 border-[#0071e3] -ml-[2px]'
                                  : 'text-[#707070] hover:text-[#1d1d1f] hover:bg-[#fbfbfd]'
                              }`}
                            >
                              <span className="truncate">{art.title}</span>
                              {art.badge && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 shrink-0 font-medium">
                                  {art.badge}
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })
          )}
        </aside>

        {/* READING PANE (Isi Artikel Dokumentasi Terstruktur) */}
        <main className="lg:col-span-8 bg-white border border-[#d2d2d7] rounded-xl shadow-xs p-5 sm:p-7 space-y-6">
          {/* Breadcrumb & Meta */}
          <div className="space-y-2 border-b border-[#f0f0f2] pb-4">
            <div className="flex items-center gap-1.5 text-xs text-[#707070]">
              <span>Panduan</span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-[#1d1d1f] font-medium">{activeArticle.category}</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1d1d1f]">
                {activeArticle.title}
              </h2>
              <div className="flex items-center gap-2 shrink-0">
                {activeArticle.badge && (
                  <Badge variant="outline" className="text-xs bg-[#f4f8fb] text-[#0066cc] border-[#d2d2d7]">
                    {activeArticle.badge}
                  </Badge>
                )}
                <span className="flex items-center gap-1 text-xs text-[#707070]">
                  <Clock className="h-3.5 w-3.5" /> {activeArticle.readTime}
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#707070] leading-relaxed pt-1">
              {activeArticle.excerpt}
            </p>
          </div>

          {/* Render Sections */}
          <div className="space-y-6">
            {activeArticle.sections.map((sec, idx) => (
              <div key={idx} className="space-y-4">
                <h3 className="text-base sm:text-lg font-bold text-[#1d1d1f] flex items-center gap-2 border-b border-[#f0f0f2] pb-2">
                  <span className="h-2 w-2 rounded-full bg-[#0071e3]" />
                  {sec.heading}
                </h3>

                {sec.content.map((p, pIdx) => (
                  <p key={pIdx} className="text-xs sm:text-sm text-[#3a3a3c] leading-relaxed">
                    {p}
                  </p>
                ))}

                {/* Callout Box Alerts */}
                {sec.callout && (
                  <div
                    className={`p-4 rounded-xl border flex items-start gap-3 text-xs sm:text-sm ${
                      sec.callout.type === 'warning'
                        ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                        : sec.callout.type === 'tip'
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                        : 'bg-blue-50/70 border-blue-200 text-blue-950'
                    }`}
                  >
                    {sec.callout.type === 'warning' ? (
                      <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    ) : sec.callout.type === 'tip' ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <Info className="h-5 w-5 text-[#0071e3] shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wider mb-0.5">
                        {sec.callout.title}
                      </h4>
                      <p className="leading-relaxed opacity-95">{sec.callout.message}</p>
                    </div>
                  </div>
                )}

                {/* Step-by-Step SOP Cards */}
                {sec.steps && sec.steps.length > 0 && (
                  <div className="space-y-2.5 pt-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#707070] block">
                      Langkah Operasional Pengurus:
                    </span>
                    <div className="space-y-2.5">
                      {sec.steps.map((st) => (
                        <Card key={st.step} className="p-3.5 bg-[#fbfbfd] border border-[#d2d2d7] shadow-2xs space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <span className="h-5 w-5 rounded-full bg-[#1d1d1f] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                                {st.step}
                              </span>
                              <div className="min-w-0">
                                <h5 className="font-bold text-xs sm:text-sm text-[#1d1d1f]">
                                  {st.title}
                                </h5>
                                <p className="text-xs text-[#707070] mt-0.5 leading-relaxed">
                                  {st.description}
                                </p>
                              </div>
                            </div>

                            {st.actionLink && (
                              <NavLink
                                to={st.actionLink.to}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#d2d2d7] text-[#0066cc] hover:bg-[#f4f8fb] transition shrink-0 shadow-2xs self-start sm:self-auto"
                              >
                                <span>{st.actionLink.label}</span>
                                <ArrowRight className="h-3 w-3" />
                              </NavLink>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer Article Navigation (Previous / Next) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-6 border-t border-[#d2d2d7]">
            {prevArticle ? (
              <button
                type="button"
                onClick={() => navigate(`/admin/panduan/${prevArticle.slug}`)}
                className="flex items-center gap-2 p-3 rounded-xl border border-[#d2d2d7] hover:bg-[#f5f5f7] transition text-left group"
              >
                <ArrowLeft className="h-4 w-4 text-[#707070] group-hover:-translate-x-0.5 transition" />
                <div>
                  <span className="text-[10px] uppercase font-semibold text-[#707070] block">Sebelumnya</span>
                  <span className="text-xs font-bold text-[#1d1d1f]">{prevArticle.title}</span>
                </div>
              </button>
            ) : (
              <div />
            )}

            {nextArticle ? (
              <button
                type="button"
                onClick={() => navigate(`/admin/panduan/${nextArticle.slug}`)}
                className="flex items-center justify-end gap-2 p-3 rounded-xl border border-[#d2d2d7] hover:bg-[#f5f5f7] transition text-right group ml-auto"
              >
                <div>
                  <span className="text-[10px] uppercase font-semibold text-[#707070] block">Selanjutnya</span>
                  <span className="text-xs font-bold text-[#1d1d1f]">{nextArticle.title}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-[#707070] group-hover:translate-x-0.5 transition" />
              </button>
            ) : (
              <div />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
