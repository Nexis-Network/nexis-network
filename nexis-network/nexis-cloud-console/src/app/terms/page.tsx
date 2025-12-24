export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background-page text-text-primary">
      <div className="container mx-auto max-w-4xl px-6 py-16 space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-white">Terms of Service</h1>
        <p className="text-text-secondary text-sm">
          Effective date: December 24, 2025
        </p>

        <section className="space-y-3 text-sm text-text-secondary">
          <h2 className="text-xl text-white">Acceptance</h2>
          <p>
            By accessing the Nexis Cloud Console, you agree to comply with these terms and all
            applicable laws. If you do not agree, do not use the service.
          </p>
        </section>

        <section className="space-y-3 text-sm text-text-secondary">
          <h2 className="text-xl text-white">Account Responsibilities</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Keep authentication methods and API keys secure.</li>
            <li>Ensure deployed workloads comply with applicable laws and policies.</li>
            <li>Notify us promptly of unauthorized access.</li>
          </ul>
        </section>

        <section className="space-y-3 text-sm text-text-secondary">
          <h2 className="text-xl text-white">Acceptable Use</h2>
          <p>
            You agree not to abuse the platform, attempt to bypass security controls, or deploy
            workloads that violate legal or contractual requirements.
          </p>
        </section>

        <section className="space-y-3 text-sm text-text-secondary">
          <h2 className="text-xl text-white">Billing</h2>
          <p>
            Billing is based on usage and the pricing terms shown in the console. Failure to pay
            may result in suspended access to services.
          </p>
        </section>

        <section className="space-y-3 text-sm text-text-secondary">
          <h2 className="text-xl text-white">Warranty Disclaimer</h2>
          <p>
            The service is provided “as is” without warranties of any kind. We do not guarantee
            uninterrupted or error-free operation.
          </p>
        </section>

        <section className="space-y-3 text-sm text-text-secondary">
          <h2 className="text-xl text-white">Limitation of Liability</h2>
          <p>
            To the extent permitted by law, Nexis Network is not liable for indirect, incidental, or
            consequential damages arising from your use of the service.
          </p>
        </section>

        <section className="space-y-3 text-sm text-text-secondary">
          <h2 className="text-xl text-white">Contact</h2>
          <p>
            For questions about these terms, contact the Nexis Network support team.
          </p>
        </section>
      </div>
    </div>
  );
}
