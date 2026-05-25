export function AccessDeniedPanel({
  title = "You do not have access to this workspace.",
  body = "Your session is valid, but this role is intentionally scoped away from this operational area.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <div className="rounded-lg border border-[#ffdcb5] bg-[#fff8ed] p-6">
      <p className="text-sm font-black uppercase text-[#c76a00]">Permission required</p>
      <h2 className="mt-2 text-2xl font-black text-[#121a46]">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-[#5d6782]">{body}</p>
    </div>
  );
}
