"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  RefreshCw,
  Clock3,
  Newspaper,
  Search,
  ChevronRight,
} from "lucide-react";

const API_BASE = "/api/daily-news";
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

type Subcategory = {
  key: string;
  name?: string;
  name_zh?: string;
};

type Category = {
  key: string;
  name?: string;
  name_zh?: string;
  subcategories?: Subcategory[];
};

type NewsItem = {
  id?: string | number;
  title?: string;
  summary_zh?: string;
  source?: string;
  link?: string;
  published_at?: string;
  coins?: string[];
  signal?: string;
  grade?: string;
};

type HotApiResponse = {
  success?: boolean;
  message?: string;
  news?: {
    items?: NewsItem[];
  };
};

type CategoriesApiResponse = {
  success?: boolean;
  categories?: Category[];
  raw?: unknown;
};

function hasChinese(text = "") {
  return /[\u4e00-\u9fff]/.test(text);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getNextRefreshTime(now = new Date()) {
  const next = new Date(now);
  next.setHours(8, 10, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next;
}

function buildHotUrl(category?: string, subcategory?: string) {
  const params = new URLSearchParams();
  params.set("type", "hot");
  if (category) params.set("category", category);
  if (subcategory) params.set("subcategory", subcategory);
  return `${API_BASE}?${params.toString()}`;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function cleanHtmlBreaks(text = "") {
  return text.replace(/<br\s*\/?>/gi, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function getChineseMainText(item: NewsItem) {
  return cleanHtmlBreaks(item.summary_zh || "");
}

export default function Page() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState("");
  const [activeSubcategory, setActiveSubcategory] = useState("");
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingNews, setLoadingNews] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [statusText, setStatusText] = useState("");
  const timerRef = useRef<number | null>(null);
  const retryTimerRef = useRef<number | null>(null);

  const activeCategoryObj = useMemo(() => {
    return categories.find((item) => item.key === activeCategory) || null;
  }, [categories, activeCategory]);

  const activeSubcategoryObj = useMemo(() => {
    return (
      activeCategoryObj?.subcategories?.find(
        (item) => item.key === activeSubcategory
      ) || null
    );
  }, [activeCategoryObj, activeSubcategory]);

  const filteredNews = useMemo(() => {
    const q = keyword.trim().toLowerCase();

    return newsItems.filter((item) => {
      const text = [
        getChineseMainText(item),
        item.source || "",
      ]
        .join(" ")
        .toLowerCase();

      return !q || text.includes(q);
    });
  }, [newsItems, keyword]);

  async function loadCategories() {
    setLoadingCategories(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}?type=categories`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`分类加载失败: ${text || res.status}`);
      }

      const data: CategoriesApiResponse | Category[] = await res.json();

      const list: Category[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.categories)
        ? data.categories
        : [];

      setCategories(list);

      if (!list.length) {
        throw new Error("分类数据为空");
      }

      const currentCategory = list.find((item) => item.key === activeCategory);

      if (!currentCategory) {
        const firstCategory = list[0];
        setActiveCategory(firstCategory.key);
        setActiveSubcategory(firstCategory.subcategories?.[0]?.key || "");
      } else {
        const subExists = currentCategory.subcategories?.some(
          (item) => item.key === activeSubcategory
        );

        if (!subExists) {
          setActiveSubcategory(currentCategory.subcategories?.[0]?.key || "");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "分类加载失败");
    } finally {
      setLoadingCategories(false);
    }
  }

  async function loadNews(
    category = activeCategory,
    subcategory = activeSubcategory,
    retryCount = 0
  ) {
    if (!category) return;

    if (retryCount === 0) {
      setLoadingNews(true);
      setError("");
      setStatusText("");
    }

    try {
      const res = await fetch(buildHotUrl(category, subcategory), {
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`新闻加载失败: ${text || res.status}`);
      }

      const data: HotApiResponse = await res.json();

      if (data?.success === false) {
        const message = data?.message || "数据暂未就绪";

        if (message.includes("数据正在生成中") && retryCount < MAX_RETRIES) {
          setStatusText(`数据生成中，正在重试（${retryCount + 1}/${MAX_RETRIES}）...`);

          retryTimerRef.current = window.setTimeout(() => {
            loadNews(category, subcategory, retryCount + 1);
          }, RETRY_DELAY_MS);

          return;
        }

        throw new Error(message);
      }

      const items: NewsItem[] = data?.news?.items || [];

      const zhOnly = items
        .filter((item) => hasChinese(item.summary_zh || ""))
        .map((item) => ({
          ...item,
          summary_zh: cleanHtmlBreaks(item.summary_zh || "暂无中文摘要"),
        }));

      setNewsItems(zhOnly);
      setUpdatedAt(new Date().toISOString());
      setError("");
      setStatusText(
        zhOnly.length ? `已获取 ${zhOnly.length} 条中文内容` : "当前分类暂无中文内容"
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "新闻加载失败");
      setStatusText("");
      setNewsItems([]);
    } finally {
      if (retryCount === 0 || retryCount >= MAX_RETRIES) {
        setLoadingNews(false);
      }
    }
  }

  useEffect(() => {
    loadCategories();

    return () => {
      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current);
      }
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!loadingCategories && activeCategory) {
      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current);
      }
      loadNews(activeCategory, activeSubcategory, 0);
    }
  }, [loadingCategories, activeCategory, activeSubcategory]);

  useEffect(() => {
    function scheduleRefresh() {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }

      const now = new Date();
      const next = getNextRefreshTime(now);
      const wait = next.getTime() - now.getTime();

      timerRef.current = window.setTimeout(async () => {
        await loadCategories();
        if (activeCategory) {
          await loadNews(activeCategory, activeSubcategory, 0);
        }
        scheduleRefresh();
      }, wait);
    }

    scheduleRefresh();

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [activeCategory, activeSubcategory]);

  const nextRefresh = useMemo(() => {
    return formatDate(getNextRefreshTime().toISOString());
  }, [updatedAt]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl p-4 md:p-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-8 lg:h-[calc(100vh-4rem)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold">中文热点日报</h1>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  只展示中文内容，界面简洁，重点展示新闻摘要。
                </p>
              </div>
              <div className="rounded-2xl bg-slate-100 p-2">
                <Newspaper className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-slate-100 p-3 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4" />
                每天 08:10 自动刷新
              </div>
              <div className="mt-2 text-xs text-slate-500">
                下次刷新：{nextRefresh}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                最近更新：{updatedAt ? formatDate(updatedAt) : "尚未更新"}
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="搜索中文内容"
                  className="w-full rounded-2xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-slate-400"
                />
              </div>

              <button
                onClick={() => {
                  if (retryTimerRef.current) {
                    window.clearTimeout(retryTimerRef.current);
                  }
                  loadCategories();
                  if (activeCategory) {
                    loadNews(activeCategory, activeSubcategory, 0);
                  }
                }}
                className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm transition hover:bg-slate-50"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                刷新
              </button>
            </div>

            <div className="mt-5 max-h-[calc(100vh-20rem)] overflow-y-auto pr-1">
              {loadingCategories ? (
                <div className="text-sm text-slate-500">分类加载中...</div>
              ) : (
                <div className="space-y-5">
                  {categories.map((category) => {
                    const isActive = category.key === activeCategory;

                    return (
                      <div key={category.key} className="space-y-2">
                        <button
                          onClick={() => {
                            setActiveCategory(category.key);
                            setActiveSubcategory(
                              category.subcategories?.[0]?.key || ""
                            );
                          }}
                          className={cn(
                            "flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm transition",
                            isActive
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          )}
                        >
                          <span className="font-medium">
                            {category.name_zh || category.name || category.key}
                          </span>
                          <ChevronRight className="h-4 w-4" />
                        </button>

                        {isActive && (category.subcategories?.length || 0) > 0 && (
                          <div className="flex flex-wrap gap-2 px-1">
                            {category.subcategories!.map((sub) => {
                              const active = sub.key === activeSubcategory;

                              return (
                                <button
                                  key={sub.key}
                                  onClick={() => setActiveSubcategory(sub.key)}
                                  className={cn(
                                    "rounded-full px-3 py-1.5 text-xs transition",
                                    active
                                      ? "bg-slate-900 text-white"
                                      : "bg-white text-slate-600 shadow-sm ring-1 ring-slate-200"
                                  )}
                                >
                                  {sub.name_zh || sub.name || sub.key}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          <section className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="text-sm text-slate-500">当前栏目</div>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                    {activeSubcategoryObj?.name_zh ||
                      activeCategoryObj?.name_zh ||
                      "热点内容"}
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                    只保留中文摘要，减少英文干扰，方便快速浏览。
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-white">
                    纯中文展示
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                    内容优先
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                    极简布局
                  </span>
                </div>
              </div>
            </div>

            {statusText ? (
              <div className="rounded-3xl border border-amber-200 bg-white p-6 text-sm text-amber-600 shadow-sm">
                {statusText}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-3xl border border-red-200 bg-white p-6 text-sm text-red-500 shadow-sm">
                {error}
              </div>
            ) : null}

            {loadingNews ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
                新闻加载中...
              </div>
            ) : filteredNews.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
                当前分类下暂无可展示的中文内容。
              </div>
            ) : (
              filteredNews.map((item, index) => (
                <motion.a
                  key={`${item.id ?? item.link ?? index}-${index}`}
                  href={item.link || "#"}
                  target="_blank"
                  rel="noreferrer"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="block"
                >
                  <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>{item.source || "未知来源"}</span>
                      <span>•</span>
                      <span>{formatDate(item.published_at)}</span>
                    </div>

                    <p className="mt-3 whitespace-pre-line text-[16px] leading-8 text-slate-800">
                      {getChineseMainText(item) || "暂无中文摘要"}
                    </p>

                    {(item.signal || item.grade) && (
                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                        {item.signal ? (
                          <span className="rounded-full bg-slate-100 px-3 py-1">
                            信号：{item.signal}
                          </span>
                        ) : null}
                        {item.grade ? (
                          <span className="rounded-full bg-slate-100 px-3 py-1">
                            评级：{item.grade}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </article>
                </motion.a>
              ))
            )}
          </section>
        </div>
      </div>
    </main>
  );
}