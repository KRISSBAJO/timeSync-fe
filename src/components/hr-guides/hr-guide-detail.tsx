import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, BookOpen, Eye, MessageCircle, ThumbsUp } from "lucide-react";

import { HrGuideActions } from "@/components/hr-guides/hr-guide-actions";
import { HrGuideCard } from "@/components/hr-guides/hr-guide-card";
import type { HrArticleDetail } from "@/lib/hr-guides/types";

export function HrGuideDetail({ article }: { article: HrArticleDetail }) {
  const paragraphs = article.body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <main className="min-h-screen bg-[#f6f8fc] text-[#101735]">
      <article className="border-b border-[#e3e9f4] bg-white">
        <div className="section-inner py-8">
          <Link href="/hr-guides" className="inline-flex items-center gap-2 text-sm font-black text-[#3820d7]">
            <ArrowLeft size={15} aria-hidden="true" />
            HR Guides
          </Link>
        </div>

        <header className="section-inner grid gap-10 pb-14 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase text-[#3820d7]">
              <span>{article.category?.name ?? "HR Guides"}</span>
              <span className="h-1 w-1 rounded-full bg-[#aab4c8]" />
              <span>{article.readingMinutes} min read</span>
              {article.publishedAt ? (
                <>
                  <span className="h-1 w-1 rounded-full bg-[#aab4c8]" />
                  <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                </>
              ) : null}
            </div>
            <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[1.03] tracking-normal text-[#11143a] md:text-6xl">
              {article.title}
            </h1>
            {article.subtitle ? (
              <p className="mt-6 max-w-3xl text-xl leading-8 text-[#5b667c]">{article.subtitle}</p>
            ) : null}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Author article={article} />
              <Stat icon={Eye} value={article.readCount} label="reads" />
              <Stat icon={ThumbsUp} value={article.likeCount} label="likes" />
              <Stat icon={MessageCircle} value={article.commentCount} label="comments" />
            </div>
          </div>

          <aside className="rounded-lg border border-[#dfe7f4] bg-[#11143a] p-6 text-white shadow-[0_24px_80px_rgba(17,20,58,0.18)]">
            <p className="text-[11px] font-black uppercase text-[#9db3ff]">Implementation lens</p>
            <p className="mt-4 text-lg font-black leading-7">
              Save this guide for tenant launches, HR operations reviews, and workforce data model decisions.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <span key={tag} className="rounded-md bg-white/10 px-2.5 py-1 text-[11px] font-black text-white">
                  {tag}
                </span>
              ))}
            </div>
          </aside>
        </header>

        <div className="section-inner pb-12">
          <div className="relative aspect-[16/7] overflow-hidden rounded-lg border border-[#dfe7f4] bg-[#f3f6fd] shadow-[0_24px_80px_rgba(17,20,58,0.1)]">
            {article.heroImageUrl ? (
              <Image
                src={article.heroImageUrl}
                alt=""
                fill
                priority
                sizes="(min-width: 1024px) 76rem, 100vw"
                className="object-cover"
              />
            ) : (
              <span className="absolute inset-0 bg-[linear-gradient(135deg,rgba(56,32,215,0.14),rgba(47,110,234,0.1),rgba(18,184,134,0.12))]" />
            )}
          </div>
        </div>
      </article>

      <section className="section-inner py-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,760px)_1fr]">
          <div className="rounded-lg border border-[#dfe7f4] bg-white p-6 shadow-[0_24px_70px_rgba(17,20,58,0.06)] md:p-9">
            <div className="prose-lite">
              {paragraphs.map((paragraph, index) => (
                <p key={`${index}-${paragraph.slice(0, 12)}`}>{paragraph}</p>
              ))}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-lg border border-[#dfe7f4] bg-white p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-md bg-[#eef2ff] text-[#3820d7]">
                  <BookOpen size={18} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-black text-[#11143a]">Reading mode</p>
                  <p className="text-[12px] font-bold text-[#667085]">Built for operators, not fluff.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <HrGuideActions
          slug={article.slug}
          initialLikeCount={article.likeCount}
          initialHelpfulCount={article.helpfulCount}
          initialComments={article.comments}
        />

        {article.related.length ? (
          <section className="mt-14">
            <p className="section-kicker">Related guides</p>
            <div className="mt-5 grid gap-5 md:grid-cols-3">
              {article.related.map((related) => (
                <HrGuideCard key={related.id} article={related} />
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}

function Author({ article }: { article: HrArticleDetail }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-lg border border-[#dfe7f4] bg-white px-3 py-2 shadow-sm">
      <span className="grid h-10 w-10 place-items-center rounded-md bg-[#eef2ff] text-sm font-black text-[#3820d7]">
        {article.authorName.slice(0, 1).toUpperCase()}
      </span>
      <span>
        <span className="block text-sm font-black text-[#11143a]">{article.authorName}</span>
        <span className="block text-[11px] font-bold text-[#667085]">{article.authorTitle ?? "TimeSync"}</span>
      </span>
    </div>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Eye;
  value: number;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-[#dfe7f4] bg-white px-3 py-2 text-sm font-black text-[#34405f] shadow-sm">
      <Icon size={15} className="text-[#667085]" aria-hidden="true" />
      {new Intl.NumberFormat(undefined, { notation: "compact" }).format(value)}
      <span className="font-bold text-[#8a94aa]">{label}</span>
    </span>
  );
}
