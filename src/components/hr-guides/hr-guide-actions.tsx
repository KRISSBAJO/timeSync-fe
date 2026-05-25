"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { Loader2, MessageCircle, ThumbsUp } from "lucide-react";

import { apiFetch } from "@/lib/api/client";
import type { HrArticleComment, HrArticleReactionResponse } from "@/lib/hr-guides/types";

export function HrGuideActions({
  slug,
  initialLikeCount,
  initialHelpfulCount,
  initialComments,
}: {
  slug: string;
  initialLikeCount: number;
  initialHelpfulCount: number;
  initialComments: HrArticleComment[];
}) {
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [helpfulCount, setHelpfulCount] = useState(initialHelpfulCount);
  const [comments, setComments] = useState(initialComments);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const sortedComments = useMemo(
    () => [...comments].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [comments],
  );

  function react(type: "LIKE" | "HELPFUL") {
    setNotice(null);
    startTransition(async () => {
      try {
        const response = await apiFetch<HrArticleReactionResponse>(`/hr-guides/${slug}/reactions`, {
          method: "POST",
          body: JSON.stringify({ type }),
        });
        setLikeCount(response.likeCount);
        setHelpfulCount(response.helpfulCount);
      } catch (caught) {
        setNotice(caught instanceof Error ? caught.message : "Reaction failed.");
      }
    });
  }

  function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setNotice(null);

    startTransition(async () => {
      try {
        const comment = await apiFetch<HrArticleComment>(`/hr-guides/${slug}/comments`, {
          method: "POST",
          body: JSON.stringify({
            displayName: String(formData.get("displayName") ?? ""),
            email: String(formData.get("email") ?? ""),
            body: String(formData.get("body") ?? ""),
          }),
        });
        setComments((current) => [comment, ...current]);
        form.reset();
        setNotice("Comment added.");
      } catch (caught) {
        setNotice(caught instanceof Error ? caught.message : "Comment failed.");
      }
    });
  }

  return (
    <section className="mt-12 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-lg border border-[#dfe7f4] bg-white p-5 shadow-[0_18px_52px_rgba(17,20,58,0.06)]">
        <p className="text-[11px] font-black uppercase text-[#667085]">Article actions</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <button
            type="button"
            onClick={() => react("LIKE")}
            disabled={isPending}
            className="flex items-center justify-between rounded-lg border border-[#dfe7f4] bg-[#fbfcff] px-4 py-3 text-left transition hover:border-[#cbd5e8] hover:bg-white disabled:opacity-60"
          >
            <span className="inline-flex items-center gap-3 text-sm font-black text-[#11143a]">
              <ThumbsUp size={17} className="text-[#3820d7]" aria-hidden="true" />
              Like this guide
            </span>
            <span className="text-sm font-black text-[#3820d7]">{likeCount}</span>
          </button>
          <button
            type="button"
            onClick={() => react("HELPFUL")}
            disabled={isPending}
            className="flex items-center justify-between rounded-lg border border-[#dfe7f4] bg-[#fbfcff] px-4 py-3 text-left transition hover:border-[#cbd5e8] hover:bg-white disabled:opacity-60"
          >
            <span className="inline-flex items-center gap-3 text-sm font-black text-[#11143a]">
              <MessageCircle size={17} className="text-[#12b886]" aria-hidden="true" />
              Mark helpful
            </span>
            <span className="text-sm font-black text-[#12a678]">{helpfulCount}</span>
          </button>
        </div>
        {notice ? (
          <p className="mt-4 rounded-lg bg-[#f5f7ff] px-3 py-2 text-sm font-bold text-[#34405f]">
            {notice}
          </p>
        ) : null}
      </div>

      <div className="rounded-lg border border-[#dfe7f4] bg-white p-5 shadow-[0_18px_52px_rgba(17,20,58,0.06)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black uppercase text-[#667085]">Discussion</p>
            <h2 className="mt-1 text-xl font-black text-[#11143a]">Comments and field notes</h2>
          </div>
          {isPending ? <Loader2 size={18} className="animate-spin text-[#3820d7]" aria-hidden="true" /> : null}
        </div>

        <form onSubmit={submitComment} className="mt-5 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="displayName" required minLength={2} placeholder="Your name" className="landing-input" />
            <input name="email" type="email" placeholder="Email optional" className="landing-input" />
          </div>
          <textarea
            name="body"
            required
            minLength={3}
            rows={4}
            placeholder="Add a practical note, question, or implementation insight."
            className="landing-input min-h-28 py-3"
          />
          <button type="submit" disabled={isPending} className="landing-button-primary w-fit disabled:opacity-60">
            Add comment
          </button>
        </form>

        <div className="mt-6 grid gap-3">
          {sortedComments.map((comment) => (
            <article key={comment.id} className="rounded-lg border border-[#edf1f7] bg-[#fbfcff] p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-md bg-[#eef2ff] text-sm font-black text-[#3820d7]">
                  {comment.displayName.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <p className="text-sm font-black text-[#11143a]">{comment.displayName}</p>
                  <p className="text-[11px] font-bold text-[#8a94aa]">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#4f5a75]">{comment.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
