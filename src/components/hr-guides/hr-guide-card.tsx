import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Eye, MessageCircle, ThumbsUp } from "lucide-react";

import type { HrArticle } from "@/lib/hr-guides/types";

export function HrGuideCard({
  article,
  priority = false,
}: {
  article: HrArticle;
  priority?: boolean;
}) {
  return (
    <article
      className={
        priority
          ? "group relative overflow-hidden rounded-lg border border-[#dfe7f4] bg-white p-6 shadow-[0_24px_70px_rgba(17,20,58,0.08)] transition hover:-translate-y-1 hover:shadow-[0_30px_90px_rgba(17,20,58,0.12)]"
          : "group relative overflow-hidden rounded-lg border border-[#dfe7f4] bg-white p-5 shadow-[0_16px_48px_rgba(17,20,58,0.06)] transition hover:-translate-y-1 hover:shadow-[0_24px_68px_rgba(17,20,58,0.1)]"
      }
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#3820d7,#2f6eea,#12b886)] opacity-0 transition group-hover:opacity-100" />
      <Link
        href={`/hr-guides/${article.slug}`}
        className="relative mb-5 block aspect-[16/9] overflow-hidden rounded-lg border border-[#edf1f7] bg-[#f3f6fd]"
      >
        {article.heroImageUrl ? (
          <Image
            src={article.heroImageUrl}
            alt=""
            fill
            sizes={priority ? "(min-width: 1024px) 48vw, 100vw" : "(min-width: 1024px) 30vw, 100vw"}
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="absolute inset-0 bg-[linear-gradient(135deg,rgba(56,32,215,0.14),rgba(47,110,234,0.1),rgba(18,184,134,0.12))]" />
        )}
      </Link>
      <div className="flex items-center gap-2 text-[11px] font-black uppercase text-[#3820d7]">
        <span>{article.category?.name ?? "HR Guides"}</span>
        <span className="h-1 w-1 rounded-full bg-[#aab4c8]" />
        <span>{article.readingMinutes} min read</span>
      </div>
      <h3 className={priority ? "mt-4 text-2xl font-black leading-tight text-[#11143a]" : "mt-4 text-lg font-black leading-tight text-[#11143a]"}>
        <Link href={`/hr-guides/${article.slug}`} className="outline-none focus-visible:underline">
          {article.title}
        </Link>
      </h3>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#5b667c]">{article.excerpt}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {article.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="rounded-md bg-[#f2f5ff] px-2.5 py-1 text-[11px] font-black text-[#4a54a4]">
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-6 flex items-center justify-between border-t border-[#edf1f7] pt-4">
        <div className="flex items-center gap-4 text-[12px] font-bold text-[#667085]">
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
        <Link
          href={`/hr-guides/${article.slug}`}
          className="inline-flex items-center gap-2 text-[12px] font-black text-[#3820d7] transition group-hover:translate-x-1"
        >
          Read
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

function formatCompact(value: number) {
  return new Intl.NumberFormat(undefined, { notation: "compact" }).format(value);
}
