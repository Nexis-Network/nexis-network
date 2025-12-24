export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background-page text-text-primary">
      <div className="container mx-auto max-w-4xl px-6 py-16 space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-white">Privacy Policy</h1>
        <p className="text-text-secondary text-sm">
          Effective date: December 24, 2025
        </p>

        <section className="space-y-3 text-sm text-text-secondary">
          <h2 className="text-xl text-white">Overview</h2>
          <p>
            Nexis Cloud Console helps you manage confidential compute workloads. This policy
            describes what data we collect, how we use it, and your choices.
          </p>
        </section>

        <section className="space-y-3 text-sm text-text-secondary">
          <h2 className="text-xl text-white">Data We Collect</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Account identifiers and authentication metadata (email, wallet address).</li>
            <li>Usage telemetry (API requests, CVM lifecycle events, billing metrics).</li>
            <li>Support and incident details you provide.</li>
          </ul>
        </section>

        <section className="space-y-3 text-sm text-text-secondary">
          <h2 className="text-xl text-white">How We Use Data</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Operate and secure the Nexis Cloud Console and connected services.</li>
            <li>Provision CVMs, monitor health, and provide billing visibility.</li>
            <li>Improve product reliability, analytics, and incident response.</li>
          </ul>
        </section>

        <section className="space-y-3 text-sm text-text-secondary">
          <h2 className="text-xl text-white">Data Sharing</h2>
          <p>
            We share data with subprocessors that provide authentication, monitoring, analytics,
            and billing services. These providers are bound by contractual obligations to protect
            your data.
          </p>
        </section>

        <section className="space-y-3 text-sm text-text-secondary">
          <h2 className="text-xl text-white">Security</h2>
          <p>
            Sensitive configuration values are encrypted before storage. Access is controlled by
            role-based permissions and authenticated sessions.
          </p>
        </section>

        <section className="space-y-3 text-sm text-text-secondary">
          <h2 className="text-xl text-white">Your Choices</h2>
          <p>
            You can update your profile data, rotate API keys, and manage team membership within
            the console. For deletion requests, contact support with your account identifier.
          </p>
        </section>
      </div>
    </div>
  );
}
