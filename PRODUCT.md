# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React 19 + TypeScript + Vite, Tailwind CSS, framer-motion for animations, lucide-react for icons. Deployed via Vercel. Backend: Firebase (Firestore, realtime data, OAuth). No breaking from this stack without explicit request.

## Users

Primary user: **PDG/Directeur général & Directeur opérationnel de PME (50-500 personnes)** who needs to:
- Understand if their operations are bleeding money invisibly (eroded margins, chaos, key-person risk)
- Discover what a structured, measurable approach to quality management and operational excellence could unlock
- Evaluate whether a QHSE audit or consulting engagement is worth the investment

Secondary user: **RH/QSE coordinator or manager** evaluating implementation support for their company.

**Job to be done**: Arrive skeptical (QHSE is often sold as compliance overhead). Leave convinced that fixing structural chaos is the highest-ROI investment they can make. Decide to book a first audit or consultation.

## Product Purpose

Cabinet Delacour is a fractional QHSE consulting firm that helps French PMEs unlock hidden operational profit through diagnostic audits, structured process documentation, and ongoing management system optimization.

**What makes it different**: Not a heavy-handed 18-month ISO consulting shop. Instead: surgical 48-hour diagnostic flashes that identify the money leaks, then flexible engagement models (monthly retainers, pre-audit simulations, certification support). Serves PMEs that can't afford a dedicated QSE director.

**Success looks like**: A prospect books an initial audit or consultation. That audit produces a "Points Rouges" report that feels financially real (not generic compliance theater). The client moves forward with implementation.

## Positioning

**The mechanism**: Cost-based, ruthlessly practical. Cabinet Delacour quantifies what PME decision-makers actually care about: eroded margins, key-person risk, wasted labor, governance blindness. The argument is financial—hidden losses in every PME are quantifiable—not compliance-driven. 

**The differentiation**:
1. **PME-optimized pricing & engagement models** — No 18-month captive contracts; diagnosis-first, then pay-per-value monthly retainers
2. **Diagnostic-driven, not standard-driven** — The audit proves the point before selling the solution
3. **Lean office + operational excellence angle** — Framing QSE as a profit machine, not a burden

**Against competitors**: Most QHSE firms sell compliance. Cabinet Delacour sells operational sanity and measurable margin recovery. The positioning is "operational surgeon" not "compliance consultant."

## Operating Context

- **How the sale works**: 
  1. PME leader lands on the site, sees the "Trois Piliers" (Autonomy, Stop Double-Work, Control Dashboard) framed as profit recovery
  2. The Diagnostic tool (interactive, estimate-based) gives them a rough ROI
  3. They book a 48h "Audit Flash" (Diagnostic Robustesse) at a fixed price
  4. The audit delivers a "Points Rouges" report + immediate action plan
  5. If convinced, they move to a monthly retainer or 6-9 month program for ISO 9001 implementation

- **Regulatory context**: Cabinet operates under French QHSE standards (ISO 9001, ISO 14001, ISO 45001), with legal/compliance review built into deliverables. All client engagement is business-to-business (B2B).

- **Business model**: Audit-first generates leads → Monthly retainers or project-based engagements provide recurring revenue → ISO 9001 certification or specialized programs (hospitality, manufacturing) are premium upsells.

## Capabilities and Constraints

### Capabilities
- Rapid diagnostics (48-hour flashes)
- ISO 9001, ISO 14001, ISO 45001 implementation support
- Pre-audit simulations ("Audit Blanc")
- Process documentation & optimization (Lean office principles)
- Data-driven management system design
- Client support across industries (manufacturing, services, logistics, hospitality, healthcare)

### Constraints
- **Scalability**: Cabinet is small; cannot take unlimited clients. Premium positioning (selective engagement).
- **Delivery model**: Remote + on-site hybrid; not fully remote.
- **Timeline**: Certification programs run 6-9 months; cannot be rushed without compromising quality.
- **Language**: Services are delivered in French; site is French-primary, English secondary for international interest only.

### Undecided facts
- Expansion to a second location or hiring model (TBD)
- Product line for self-service (e.g., downloadable audit templates) vs. high-touch only (TBD)

## Brand Commitments

### Identity & Voice
- **Tone**: No corporate fluff. Direct, financial, slightly irreverent ("payez-vous vos équipes pour faire ou pour refaire ?").
- **Visual identity**: Existing color system (emerald green #10B981 as primary accent). Professional but approachable. Dark, technical, cinematic imagery (precision machinery, compasses, seals, spirals) reflect the "surgical" & "architectural" framing.
- **Name & legal entity**: Cabinet Delacour (SARL or similar registered in France). Logo and corporate identity are established; preserve them.

### Editorial commitments
- Site copy emphasizes **financial impact** (specific € losses for each pillar: "€300k/yr in salarial waste", "-30% non-conformities", "€890k/yr from structuring").
- All claims are backed by methodology (IDC studies, Lean Office standards, ISO frameworks).
- Testimonials are real client case studies with verifiable metrics.

### Technical commitments
- **Sovereignty**: No hard dependency on US cloud for core infrastructure (Firebase is acceptable; data residency in EU when legally required).
- **Performance**: Site must load fast (Vercel standard). Mobile-first responsive (SME decision-makers often research on mobile during downtime).
- **Accessibility**: WCAG AA minimum (important for government/public-sector clients evaluating Cabinet).

## Evidence on Hand

- **Real client case studies** (with permission): Marc Dubreuil (Directeur Industriel, -30% non-conformités), Sophie Valette (Responsable QSE, certification renewed).
- **Operational data**: 4 service tiers (Diagnostic Flash, Monthly Retainer, ISO 9001, Audit Blanc). Typical engagement: €5-30k for diagnostics; €2-5k/month for retainers; €15-50k for 6-month ISO programs.
- **Deliverables inventory**: "Points Rouges" reports, process documentation templates, management dashboards (Excel-based or Cockpit app), audit simulation reports. (Stored in `OUTILS_RENTABILITE_DELACOUR/` directory.)
- **Process assets**: Guides, checklists, deployment runbooks for client onboarding (see `directives/` folder).

### Absences that must not be invented
- No fabricated case studies or testimonials.
- No fictional pricing or ROI guarantees beyond what the Diagnostic tool calculates.
- No claims about "100% success rate" without backing from real audit passes. (Current: "Guarantee of result" for ISO 9001 is a confidence statement, not a legal guarantee.)

## Product Principles

1. **Financial honesty first** — Every design choice, every pitch, every feature starts with: "Does this help the buyer see the true cost of chaos and the payoff of structure?" Compliance is a byproduct; profit recovery is the goal.

2. **Surgical precision over hand-holding** — Cabinet Delacour is a specialist, not a generalist. The site and interactions reflect that: fast, focused, no bloat. Respect the buyer's time.

3. **Evidence beats assertion** — Real case studies, real methodology, real numbers. The Diagnostic tool is a working proof of concept, not marketing theater.

4. **PME-first in every choice** — Decisions about pricing, engagement length, content depth, and technology should always ask: "Will this serve a 200-person company better than a Fortune 500?"

5. **Operational excellence is contagious** — The Cabinet's own processes, documentation, and tools must be exemplary. A client seeing how Cabinet operates will demand the same standards from themselves.

## Accessibility & Inclusion

**Product-specific requirements**:
- **Language accessibility**: French-primary site with English translation for EU/international interest.
- **Cognitive accessibility**: Financial jargon must be explained inline; interactive tools (Diagnostic simulator) should guide users through complexity.
- **Visual accessibility**: WCAG AA minimum for all pages. High contrast for financial charts/data. Lucide icons are decorative; they must not be sole information carriers.
- **Regulatory**: Site may be accessed by government/public-sector clients evaluating Cabinet for tenders; accessibility must meet French legal standards (RGAA Level AA or equivalent).

---

**Next steps for design work**:
- Record the incumbent visual world in DESIGN.md (via `/impeccable document`)
- Build new surfaces or refinements using the operating context and visual commitments above
- Use `/impeccable shape` for new features (e.g., the "Outils de Rentabilité" toolbox expansion) before coding
