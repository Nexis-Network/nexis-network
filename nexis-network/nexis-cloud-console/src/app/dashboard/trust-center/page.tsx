import { fetchTrustSummary } from "@/lib/server/trust-center";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default async function TrustCenterPage() {
  const { summary, error } = await fetchTrustSummary();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Trust Center</h1>
        <p className="text-text-secondary mt-1">
          Live platform health, incident updates, and service status.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Overall status</CardTitle>
          </CardHeader>
          <CardContent className="text-lg text-white">
            {summary?.overallStatus ?? "Unknown"}
            {error && <div className="text-xs text-text-muted mt-2">{error}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Last updated</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-text-secondary">
            {formatDateTime(summary?.updatedAt ?? null)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Incidents</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-text-secondary">
            {summary?.incidents.length ?? 0} active or recent
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Service status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-text-secondary">
          {summary?.services.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {summary.services.map((service) => (
                <div
                  key={`${service.name}-${service.status}`}
                  className="rounded-md border border-border-default bg-background-surface px-3 py-2"
                >
                  <div className="text-text-primary">{service.name}</div>
                  <div className="text-xs text-text-muted">{service.status}</div>
                  {service.description && (
                    <div className="text-xs text-text-muted mt-1">{service.description}</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div>No service data available.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Incidents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-text-secondary">
          {summary?.incidents.length ? (
            <div className="space-y-3">
              {summary.incidents.map((incident) => (
                <div
                  key={incident.id}
                  className="rounded-md border border-border-default bg-background-surface px-3 py-2"
                >
                  <div className="text-text-primary">{incident.name}</div>
                  <div className="text-xs text-text-muted">
                    {incident.status} · Started {formatDateTime(incident.startedAt)}
                  </div>
                  {incident.resolvedAt && (
                    <div className="text-xs text-text-muted">
                      Resolved {formatDateTime(incident.resolvedAt)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div>No incidents reported.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
