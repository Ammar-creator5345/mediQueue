import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Card, CardBody, EmptyState, Spinner } from "@/components/Card";
import { Button } from "@/components/Button";
import { listNotifications, markNotificationRead } from "@/services/notifications";
import type { Notification } from "@/services/types";
import { formatDateTime } from "@/utils/format";
import { usePolling } from "@/hooks/usePolling";

export function NotificationsPage() {
  const { data, refresh } = usePolling<Notification[]>(() => listNotifications(), 8000);
  const [busy, setBusy] = useState<string | null>(null);

  async function onMarkRead(id: string) {
    setBusy(id);
    try {
      await markNotificationRead(id);
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-sm text-muted-foreground">Updates about your appointments and queue tokens.</p>
      </div>
      {!data ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : data.length === 0 ? (
        <EmptyState title="You're all caught up" description="Notifications will appear here as activity happens." />
      ) : (
        <div className="space-y-3">
          {data.map((n) => (
            <Card key={n.id} className={n.read ? "" : "border-primary/40 bg-accent/30"}>
              <CardBody>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Bell size={16} />
                    </span>
                    <div>
                      <p className="font-medium">{n.title}</p>
                      <p className="text-sm text-muted-foreground">{n.body}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</p>
                    </div>
                  </div>
                  {!n.read ? (
                    <Button size="sm" variant="outline" loading={busy === n.id} onClick={() => onMarkRead(n.id)}>
                      <CheckCheck size={12} /> Mark read
                    </Button>
                  ) : null}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
