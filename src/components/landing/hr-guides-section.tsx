import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Eye, MessageCircle, ThumbsUp } from "lucide-react";

import type { HrArticle } from "@/lib/hr-guides/types";

export function HrGuidesSection({ articles }: { articles: HrArticle[] }) {
  const visibleArticles = articles.slice(0, 3);

  if (!visibleArticles.length) {
    return null;
  }

  return (
    <section id="hr-guides" className="section-shell bg-white">
      <div className="section-inner">
        <div className="mx-auto max-w-3xl text-center">
          <p className="section-kicker">HR Guides</p>
          <h2 className="section-title mt-4 tracking-tighter">
            Practical guides for modern workforce teams.
          </h2>
          <p className="section-copy mx-auto mt-5 max-w-2xl">
            Clear operating playbooks for tenant administration, employee lifecycle,
            assignments, skills intelligence, governance, and workforce history.
          </p>
        </div>

        <div className="mt-11 grid gap-5 md:grid-cols-3">
          {visibleArticles.map((article) => (
            <Link
              key={article.id}
              href={`/hr-guides/${article.slug}`}
              className="group flex min-h-full flex-col overflow-hidden rounded-lg border border-[#dfe7f4] bg-white shadow-[0_18px_60px_rgba(17,20,58,0.07)] transition duration-300 hover:-translate-y-1 hover:border-[#cbd8f0] hover:shadow-[0_26px_80px_rgba(17,20,58,0.11)]"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-[#f3f6fd]">
                {article.heroImageUrl ? (
                  <Image
                    src={article.heroImageUrl}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 28vw, (min-width: 768px) 33vw, 100vw"
                    className="object-cover transition duration-500 group-hover:scale-[1.04]"
                  />
                ) : (
                  <span className="absolute inset-0 bg-[linear-gradient(135deg,rgba(56,32,215,0.14),rgba(47,110,234,0.1),rgba(18,184,134,0.12))]" />
                )}
                <span className="absolute left-4 top-4 rounded-md bg-white/90 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#3820d7] shadow-[0_10px_30px_rgba(17,20,58,0.1)] backdrop-blur">
                  {article.category?.name ?? "Guide"}
                </span>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase text-[#53607a]">
                  <span>{article.readingMinutes} min read</span>
                  <span className="h-1 w-1 rounded-full bg-[#aab4c8]" />
                  <span>{article.status === "PUBLISHED" ? "Published" : "Guide"}</span>
                </div>

                <h3 className="mt-3 text-xl font-black leading-tight text-[#11143a]">
                  {article.title}
                </h3>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#5b667c]">
                  {article.excerpt}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {article.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="rounded-md bg-[#f2f5ff] px-2.5 py-1 text-[11px] font-black text-[#4a54a4]">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-[#edf1f7] pt-5">
                  <ArticleStats article={article} />
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[#f4f6ff] text-[#3820d7] transition group-hover:bg-[#3820d7] group-hover:text-white">
                    <ArrowRight size={16} aria-hidden="true" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-9 flex justify-center">
          <Link href="/hr-guides" className="landing-button-secondary">
            View all guides
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function ArticleStats({ article }: { article: HrArticle }) {
  return (
    <div className="flex items-center gap-3 text-[12px] font-bold text-[#667085]">
      <span className="inline-flex items-center gap-1.5">
        <Eye size={14} aria-hidden="true" />
        {formatCompact(article.readCount)}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <ThumbsUp size={14} aria-hidden="true" />
        {formatCompact(article.likeCount)}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <MessageCircle size={14} aria-hidden="true" />
        {formatCompact(article.commentCount)}
      </span>
    </div>
  );
}

function formatCompact(value: number) {
  return new Intl.NumberFormat(undefined, { notation: "compact" }).format(value);
}
