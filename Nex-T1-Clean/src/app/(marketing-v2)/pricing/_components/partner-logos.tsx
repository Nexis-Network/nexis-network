const partners = [
  "Supabase",
  "Moralis",
  "Phala",
  "LangSmith",
  "Anthropic",
  "Upstash",
];

export function PartnerLogos() {
  return (
    <section className="border-y border-white/5 bg-[#0c0c0c] py-14">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-6 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-white/40">Trusted by teams modernizing crypto ops</p>
        <div className="grid w-full grid-cols-2 gap-4 opacity-80 sm:grid-cols-3 md:grid-cols-6">
          {partners.map((partner) => (
            <div
              key={partner}
              className="rounded-full border border-white/12 bg-white/5 px-4 py-2 text-center text-xs uppercase tracking-[0.28em] text-white/70"
            >
              {partner}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
