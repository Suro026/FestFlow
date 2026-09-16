"use client";

import * as React from "react";
import Link from "next/link";
import { Bell } from "@phosphor-icons/react";
import type { Notification } from "@/core/models/notification";
import { useAuth, useRepositories } from "@/components/providers";
import { useLive } from "@/components/admin/hooks";
import { Dialog, DialogContent } from "@/components/ui/overlays";
import { EmptyState } from "@/components/ui/primitives";
import { cn, formatRelative } from "@/lib/utils";

/** Live inbox for the signed-in account: the last 30, unread first. */
export const useNotifications = () => {
  const { session } = useAuth();
  const repos = useRepositories();
  const live = useLive<Notification[]>(
    (onChange, onError) => (session ? repos.notifications.subscribeForUser(session.uid, onChange, onError) : () => undefined),
    [session?.uid],
  );
  const items = React.useMemo(() => live.data ?? [], [live.data]);
  const unread = items.filter((n) => !n.read).length;
  return { items, unread, loading: session ? live.data === null : false };
};

/**
 * The bell at the end of the nav. Server-written events — a teammate's
 * answer, a seat opening up, a certificate issued — land here. Opening the
 * inbox marks everything read: the badge is a nudge, not a to-do list.
 */
export const NotificationBell = ({ className }: { className?: string }) => {
  const { session } = useAuth();
  const repos = useRepositories();
  const { items, unread, loading } = useNotifications();
  const [open, setOpen] = React.useState(false);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && session && unread > 0) void repos.notifications.markAllRead(session.uid).catch(() => undefined);
  };

  if (!session) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <button type="button" className={cn("btn btn-ghost btn-icon relative", className)} aria-label={unread ? `${unread} unread notifications` : "Notifications"} onClick={() => onOpenChange(true)}>
        <Bell size={18} weight={unread ? "fill" : "regular"} />
        {unread ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent" aria-hidden /> : null}
      </button>
      <DialogContent title="Notifications" description={items.length ? "Newest first. Everything here is also in your email." : undefined}>
        {loading ? null : items.length === 0 ? (
          <EmptyState title="Nothing yet" body="Registrations, team invitations, waitlist promotions and certificates show up here." />
        ) : (
          <div className="-mx-1 flex max-h-[60dvh] flex-col overflow-y-auto">
            {items.map((n) => {
              const inner = (
                <>
                  <div className="flex items-baseline justify-between gap-3">
                    <div className={cn("text-[13.5px]", !n.read && "font-medium")}>{n.title}</div>
                    <div className="whitespace-nowrap text-[11px] text-neutral-500">{formatRelative(n.createdAt)}</div>
                  </div>
                  {n.body ? <div className="mt-0.5 text-[12.5px] text-neutral-300">{n.body}</div> : null}
                </>
              );
              const cls = cn("block rounded-md px-2.5 py-2.5 text-inherit no-underline hover:bg-[color-mix(in_srgb,var(--color-text)_5%,transparent)]", !n.read && "shadow-[inset_2px_0_0_var(--color-accent)]");
              return n.link ? (
                <Link key={n.id} href={n.link} className={cls} onClick={() => setOpen(false)}>
                  {inner}
                </Link>
              ) : (
                <div key={n.id} className={cls}>
                  {inner}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
