export default function AuthLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f4f5f8] p-6">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-[0_22px_70px_rgba(18,31,67,0.08)]">
        <div className="mx-auto h-12 w-12 animate-pulse rounded-2xl bg-[#ece9ff]" />
        <div className="mx-auto mt-5 h-4 w-36 animate-pulse rounded bg-[#eef1f6]" />
        <div className="mx-auto mt-3 h-3 w-56 animate-pulse rounded bg-[#eef1f6]" />
      </section>
    </main>
  );
}
