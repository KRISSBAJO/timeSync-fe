"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Eye,
  FilePenLine,
  Loader2,
  MessageCircle,
  Plus,
  Search,
  Sparkles,
  ThumbsUp,
} from "lucide-react";

import { apiFetch } from "@/lib/api/client";
import type { HrArticle, HrArticleListResponse, HrArticleStatus } from "@/lib/hr-guides/types";

type Notice = {
  type: "success" | "error";
  message: string;
} | null;

export function ContentAdminCenter({
  payload,
  canWrite,
  canPublish,
}: {
  payload: HrArticleListResponse;
  canWrite: boolean;
  canPublish: boolean;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"library" | "create" | "insights">("library");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [isPending, startTransition] = useTransition();
  const filteredArticles = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return payload.data;

    return payload.data.filter((article) =>
      [article.title, article.excerpt, article.status, article.category?.name, article.authorName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [payload.data, search]);
  const publishedCount = payload.data.filter((article) => article.status === "PUBLISHED").length;
  const draftCount = payload.data.filter((article) => article.status === "DRAFT" || article.status === "REVIEW").length;
  const totalReads = payload.data.reduce((sum, article) => sum + article.readCount, 0);

  async function runAction(action: () => Promise<unknown>, successMessage: string) {
    setNotice(null);

    try {
      await action();
      setNotice({ type: "success", message: successMessage });
      startTransition(() => router.refresh());
    } catch (caught) {
      setNotice({ type: "error", message: caught instanceof Error ? caught.message : "Action failed." });
    }
  }

  async function createArticle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite) {
      setNotice({ type: "error", message: "Content write permission is required." });
      return;
    }

    const formData = new FormData(event.currentTarget);

    await runAction(
      () =>
        apiFetch("/platform/hr-guides", {
          method: "POST",
          body: JSON.stringify({
            title: stringValue(formData, "title"),
            subtitle: stringValue(formData, "subtitle"),
            categorySlug: stringValue(formData, "categorySlug"),
            excerpt: stringValue(formData, "excerpt"),
            body: stringValue(formData, "body"),
            heroImageUrl: stringValue(formData, "heroImageUrl") || undefined,
            tags: stringValue(formData, "tags")
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean),
            status: stringValue(formData, "status") || "DRAFT",
            visibility: "PUBLIC",
            featured: formData.get("featured") === "on",
            pinned: formData.get("pinned") === "on",
            authorType: stringValue(formData, "authorType") || "APP",
            authorPersonId: stringValue(formData, "authorPersonId") || undefined,
            authorName: stringValue(formData, "authorName") || "TimeSync Editorial",
            authorTitle: stringValue(formData, "authorTitle") || "WorkforceOS Research",
          }),
        }),
      "HR guide created.",
    );
  }

  async function setStatus(article: HrArticle, status: HrArticleStatus) {
    if (!canPublish) {
      setNotice({ type: "error", message: "Content publish permission is required." });
      return;
    }

    await runAction(
      () =>
        apiFetch(`/platform/hr-guides/${article.id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        }),
      `${article.title} moved to ${status.toLowerCase()}.`,
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-[#dfe7f4] bg-white p-6 shadow-[0_18px_60px_rgba(17,20,58,0.06)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase text-[#3820d7]">Platform content studio</p>
            <h1 className="mt-3 text-3xl font-black tracking-normal text-[#11143a] md:text-4xl">
              HR Guides, article publishing, and reader intelligence.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#667085]">
              Create public workforce articles, publish guides from the platform team,
              track reads, likes, helpful marks, and comments, then connect them back to
              the TimeSync learning and HR operating model.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab("create")}
            className="landing-button-primary"
          >
            <Plus size={16} aria-hidden="true" />
            New guide
          </button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <Metric icon={BookOpen} label="Published" value={publishedCount} />
          <Metric icon={FilePenLine} label="Drafts and review" value={draftCount} />
          <Metric icon={Eye} label="Total reads" value={formatCompact(totalReads)} />
        </div>
      </section>

      {notice ? (
        <div
          className={
            notice.type === "success"
              ? "rounded-lg border border-[#b7efd7] bg-[#f0fff8] px-4 py-3 text-sm font-bold text-[#087f5b]"
              : "rounded-lg border border-[#ffd4d0] bg-[#fff5f5] px-4 py-3 text-sm font-bold text-[#b42318]"
          }
        >
          {notice.message}
        </div>
      ) : null}

      <section className="rounded-lg border border-[#dfe7f4] bg-white shadow-[0_18px_60px_rgba(17,20,58,0.05)]">
        <div className="flex flex-col gap-3 border-b border-[#edf1f7] p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <Tab active={activeTab === "library"} onClick={() => setActiveTab("library")} label="Article library" />
            <Tab active={activeTab === "create"} onClick={() => setActiveTab("create")} label="Create guide" />
            <Tab active={activeTab === "insights"} onClick={() => setActiveTab("insights")} label="Engagement" />
          </div>
          <label className="flex h-11 items-center gap-2 rounded-lg border border-[#dfe7f4] bg-[#fbfcff] px-3 lg:min-w-[320px]">
            <Search size={16} className="text-[#7a8297]" aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search articles"
              className="h-full min-w-0 flex-1 bg-transparent text-sm font-bold text-[#11143a] outline-none placeholder:text-[#9aa5b8]"
            />
          </label>
        </div>

        {activeTab === "library" ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f8fafd] text-[11px] font-black uppercase text-[#667085]">
                <tr>
                  <th className="px-4 py-3">Guide</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Author</th>
                  <th className="px-4 py-3">Signals</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf1f7]">
                {filteredArticles.map((article) => (
                  <tr key={article.id} className="align-top">
                    <td className="px-4 py-4">
                      <p className="font-black text-[#11143a]">{article.title}</p>
                      <p className="mt-1 max-w-xl text-[12px] leading-5 text-[#667085]">{article.excerpt}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {article.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="rounded-md bg-[#f2f5ff] px-2 py-1 text-[10px] font-black text-[#4a54a4]">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={article.status} />
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-black text-[#11143a]">{article.authorName}</p>
                      <p className="text-[12px] font-bold text-[#7a8297]">{article.authorTitle}</p>
                    </td>
                    <td className="px-4 py-4">
                      <ArticleSignal article={article} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/hr-guides/${article.slug}`} className="rounded-lg border border-[#dfe7f4] px-3 py-2 text-[12px] font-black text-[#34405f] transition hover:bg-[#f8fafd]">
                          View
                        </Link>
                        <button
                          type="button"
                          disabled={!canPublish || isPending || article.status === "PUBLISHED"}
                          onClick={() => setStatus(article, "PUBLISHED")}
                          className="rounded-lg bg-[#3820d7] px-3 py-2 text-[12px] font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          Publish
                        </button>
                        <button
                          type="button"
                          disabled={!canPublish || isPending || article.status === "ARCHIVED"}
                          onClick={() => setStatus(article, "ARCHIVED")}
                          className="rounded-lg border border-[#ffd8a8] bg-[#fff9ed] px-3 py-2 text-[12px] font-black text-[#b76b00] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          Archive
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {activeTab === "create" ? (
          <form onSubmit={createArticle} className="grid gap-5 p-5 xl:grid-cols-[1fr_0.55fr]">
            <div className="grid gap-4">
              <Field label="Title" name="title" placeholder="The HR operating model every scaling team needs" required />
              <Field label="Subtitle" name="subtitle" placeholder="Optional supporting line" />
              <Field label="Excerpt" name="excerpt" placeholder="Short article summary for listing cards" required />
              <label className="grid gap-2">
                <span className="text-[12px] font-black text-[#34405f]">Article body</span>
                <textarea
                  name="body"
                  required
                  minLength={80}
                  rows={12}
                  placeholder="Write the long-form guide. Separate paragraphs with blank lines."
                  className="landing-input min-h-72 py-3"
                />
              </label>
            </div>

            <aside className="grid content-start gap-4 rounded-lg border border-[#dfe7f4] bg-[#fbfcff] p-4">
              <Field label="Category slug" name="categorySlug" placeholder="hr-operations" />
              <Field label="Hero image URL" name="heroImageUrl" placeholder="/images/hero2.png or https://res.cloudinary.com/..." />
              <Field label="Tags" name="tags" placeholder="skills, onboarding, governance" />
              <Field label="Author name" name="authorName" placeholder="TimeSync Editorial" />
              <Field label="Author title" name="authorTitle" placeholder="WorkforceOS Research" />
              <label className="grid gap-2">
                <span className="text-[12px] font-black text-[#34405f]">Author type</span>
                <select name="authorType" className="landing-input">
                  <option value="APP">TimeSync app/editorial</option>
                  <option value="PLATFORM_USER">Platform admin</option>
                  <option value="PERSON">Person profile</option>
                </select>
              </label>
              <Field label="Author person ID" name="authorPersonId" placeholder="Optional person UUID" />
              <label className="grid gap-2">
                <span className="text-[12px] font-black text-[#34405f]">Status</span>
                <select name="status" className="landing-input">
                  <option value="DRAFT">Draft</option>
                  <option value="REVIEW">Review</option>
                  <option value="PUBLISHED">Published</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm font-bold text-[#34405f]">
                <input name="featured" type="checkbox" className="h-4 w-4 accent-[#3820d7]" />
                Feature on landing page
              </label>
              <label className="flex items-center gap-2 text-sm font-bold text-[#34405f]">
                <input name="pinned" type="checkbox" className="h-4 w-4 accent-[#3820d7]" />
                Pin above other guides
              </label>
              <button type="submit" disabled={!canWrite || isPending} className="landing-button-primary disabled:opacity-50">
                {isPending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
                Create guide
              </button>
            </aside>
          </form>
        ) : null}

        {activeTab === "insights" ? (
          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {payload.data.map((article) => (
              <article key={article.id} className="rounded-lg border border-[#dfe7f4] bg-[#fbfcff] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase text-[#3820d7]">{article.status}</p>
                    <h3 className="mt-2 text-lg font-black leading-tight text-[#11143a]">{article.title}</h3>
                  </div>
                  {article.featured ? <Sparkles size={18} className="text-[#f59f00]" aria-hidden="true" /> : null}
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2">
                  <MiniSignal icon={Eye} label="Reads" value={article.readCount} />
                  <MiniSignal icon={ThumbsUp} label="Likes" value={article.likeCount} />
                  <MiniSignal icon={MessageCircle} label="Comments" value={article.commentCount} />
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function Tab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-lg bg-[#3820d7] px-4 py-2 text-sm font-black text-white"
          : "rounded-lg border border-[#dfe7f4] bg-white px-4 py-2 text-sm font-black text-[#34405f] transition hover:bg-[#f8fafd]"
      }
    >
      {label}
    </button>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-[#edf1f7] bg-[#fbfcff] p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-md bg-[#eef2ff] text-[#3820d7]">
          <Icon size={18} aria-hidden="true" />
        </span>
        <span>
          <span className="block text-xl font-black text-[#11143a]">{value}</span>
          <span className="block text-[12px] font-bold text-[#667085]">{label}</span>
        </span>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-[12px] font-black text-[#34405f]">{label}</span>
      <input name={name} required={required} placeholder={placeholder} className="landing-input" />
    </label>
  );
}

function StatusBadge({ status }: { status: HrArticleStatus }) {
  const styles: Record<HrArticleStatus, string> = {
    DRAFT: "bg-[#f1f3f9] text-[#5f6b84]",
    REVIEW: "bg-[#fff4df] text-[#b76b00]",
    PUBLISHED: "bg-[#e9fbf3] text-[#087f5b]",
    ARCHIVED: "bg-[#fff0f0] text-[#b42318]",
  };

  return (
    <span className={`inline-flex rounded-md px-2.5 py-1 text-[11px] font-black ${styles[status]}`}>
      {status}
    </span>
  );
}

function ArticleSignal({ article }: { article: HrArticle }) {
  return (
    <div className="grid gap-1.5 text-[12px] font-bold text-[#667085]">
      <span className="inline-flex items-center gap-1.5">
        <Eye size={14} aria-hidden="true" />
        {formatCompact(article.readCount)} reads
      </span>
      <span className="inline-flex items-center gap-1.5">
        <ThumbsUp size={14} aria-hidden="true" />
        {formatCompact(article.likeCount)} likes
      </span>
      <span className="inline-flex items-center gap-1.5">
        <MessageCircle size={14} aria-hidden="true" />
        {formatCompact(article.commentCount)} comments
      </span>
    </div>
  );
}

function MiniSignal({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Eye;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg bg-white p-3">
      <Icon size={16} className="text-[#667085]" aria-hidden="true" />
      <p className="mt-2 text-lg font-black text-[#11143a]">{formatCompact(value)}</p>
      <p className="text-[11px] font-bold text-[#7a8297]">{label}</p>
    </div>
  );
}

function formatCompact(value: number) {
  return new Intl.NumberFormat(undefined, { notation: "compact" }).format(value);
}

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
