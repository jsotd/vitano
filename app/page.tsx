import WaitlistForm from "./components/WaitlistForm";

// Config — change EARLY_ACCESS_SPOTS to update the badge without touching copy
const EARLY_ACCESS_SPOTS = 100;

const VALUE_PROPS = [
  {
    icon: "📊",
    title: "Protein-first dashboard",
    body: "See your #1 number front and center — not buried under calories and micronutrients.",
  },
  {
    icon: "📸",
    title: "AI photo logging you can trust",
    body: "Snap it, confirm in one tap. No more guessing or typing — just eat and move on.",
  },
  {
    icon: "⚡",
    title: "Your usuals, one tap",
    body: "Meal-prep meals and go-to foods log instantly. Routine eating should feel effortless.",
  },
];

const FAQS = [
  {
    q: "Is it accurate?",
    a: "Surprisingly yes. Our model is trained on tens of thousands of food images and cross-referenced against nutrition databases. You tap to confirm — so you stay in the loop and can correct edge cases.",
  },
  {
    q: "Does it cost money?",
    a: "Vitano will have a free tier that covers daily photo logging. A paid plan adds unlimited history, deeper insights, and team features for coaches. Early waitlist members get a discount at launch.",
  },
  {
    q: "When does it launch?",
    a: "We're aiming for a closed beta in Q3 2026. Waitlist members get first access — no need to check back, we'll email you.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 pt-6 max-w-5xl mx-auto">
        <span className="text-white font-black text-xl tracking-tight">
          Vita<span className="text-lime-400">no</span>
        </span>
        <a
          href="#waitlist"
          className="text-sm font-semibold text-neutral-400 hover:text-white transition-colors"
        >
          Get early access →
        </a>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-20 pb-16 max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-full px-4 py-1.5 mb-8">
          <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
          <span className="text-neutral-400 text-sm font-medium">
            Early access — first {EARLY_ACCESS_SPOTS} get it free for life
          </span>
        </div>

        <h1 className="text-5xl sm:text-7xl font-black leading-[1.05] tracking-tight mb-6">
          Hit your protein
          <br />
          <span className="text-lime-400">on autopilot.</span>
        </h1>

        <p className="text-xl sm:text-2xl text-neutral-400 leading-relaxed mb-12 max-w-xl mx-auto">
          Snap a photo of your meal. We tell you if you&apos;re on track to build
          muscle — no tedious logging.
        </p>

        <div id="waitlist" className="max-w-lg mx-auto">
          <WaitlistForm />
          <p className="mt-3 text-neutral-600 text-xs">
            No spam. No credit card. Just early access.
          </p>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="border-t border-neutral-900" />
      </div>

      {/* Value props */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <h2 className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 mb-12">
          Built differently
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {VALUE_PROPS.map((vp) => (
            <div
              key={vp.title}
              className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 flex flex-col gap-4"
            >
              <span className="text-3xl">{vp.icon}</span>
              <div>
                <h3 className="font-bold text-white text-lg leading-tight mb-2">
                  {vp.title}
                </h3>
                <p className="text-neutral-400 text-sm leading-relaxed">{vp.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="border-t border-neutral-900" />
      </div>

      {/* Social proof / pull quote */}
      <section className="px-6 py-20 max-w-2xl mx-auto text-center">
        <p className="text-4xl sm:text-5xl font-black leading-tight tracking-tight mb-4">
          &ldquo;I just want to hit 180g of protein.
          <br />
          <span className="text-neutral-500">
            I don&apos;t need an app that feels like homework.&rdquo;
          </span>
        </p>
        <p className="text-neutral-600 text-sm mt-6">
          Every lifter we talked to, basically verbatim.
        </p>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="border-t border-neutral-900" />
      </div>

      {/* FAQ */}
      <section className="px-6 py-20 max-w-2xl mx-auto">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 mb-10 text-center">
          Questions
        </h2>
        <div className="flex flex-col gap-8">
          {FAQS.map((faq) => (
            <div key={faq.q}>
              <h3 className="font-bold text-white text-lg mb-2">{faq.q}</h3>
              <p className="text-neutral-400 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-6 py-20 max-w-2xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-black mb-4">
          Stop guessing your macros.
        </h2>
        <p className="text-neutral-400 mb-8">
          Get early access when we launch — free, no hassle.
        </p>
        <div className="max-w-md mx-auto">
          <WaitlistForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-900 px-6 py-8 max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-white font-black text-lg tracking-tight">
          Vita<span className="text-lime-400">no</span>
        </span>
        <p className="text-neutral-600 text-sm">
          Questions?{" "}
          <a
            href="mailto:hello@getvitano.com"
            className="text-neutral-400 hover:text-white transition-colors"
          >
            hello@getvitano.com
          </a>
        </p>
        <p className="text-neutral-700 text-xs">© 2026 Vitano</p>
      </footer>
    </div>
  );
}
