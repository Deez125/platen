"use client";

import { Mail, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Ring } from "@/components/ui/ring";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type TeamMember = {
  userId: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  role: string;
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  production: "Production",
  readonly: "Read only",
};
const ROLE_ORDER = ["owner", "admin", "member", "production", "readonly"];
// Sentinel value for the "Remove" item inside the role dropdown — intercepted
// in onValueChange so it opens the confirm dialog instead of setting a role.
const REMOVE_VALUE = "__remove__";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0] ?? "").slice(0, 2).toUpperCase();
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function TeamMembers({
  members,
  currentUserId,
  callerRole,
}: {
  members: TeamMember[];
  currentUserId: string;
  callerRole: string;
}) {
  const router = useRouter();
  const canManage = callerRole === "owner" || callerRole === "admin";
  // There's exactly one owner per shop, so ownership is never assignable via the
  // dropdown — "Owner" is excluded for everyone (it still shows as the current
  // owner's own value via the per-row `options` fallback below).
  const roleOptions = ROLE_ORDER.filter((r) => r !== "owner");

  const [pending, setPending] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);
  const [removing, setRemoving] = useState(false);

  async function handleRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    const { removeMember } = await import("@/lib/actions/team");
    const result = await removeMember(removeTarget.userId);
    setRemoving(false);
    if (!result.ok) {
      toast.error("Couldn't remove member", { description: result.error });
      return;
    }
    toast.success("Member removed");
    setRemoveTarget(null);
    router.refresh();
  }

  async function changeRole(userId: string, role: string) {
    setPending(userId);
    const { setMemberRole } = await import("@/lib/actions/team");
    const result = await setMemberRole(userId, role);
    setPending(null);
    if (!result.ok) {
      toast.error("Couldn't update role", { description: result.error });
      return;
    }
    toast.success("Role updated");
    router.refresh();
  }

  const sorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? members.filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            (m.email?.toLowerCase().includes(q) ?? false) ||
            (ROLE_LABELS[m.role] ?? m.role).toLowerCase().includes(q),
        )
      : members;
    return [...filtered].sort((a, b) => {
      const ra = ROLE_ORDER.indexOf(a.role);
      const rb = ROLE_ORDER.indexOf(b.role);
      return ra === rb ? a.name.localeCompare(b.name) : ra - rb;
    });
  }, [members, query]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search members by name, email, or role"
          className="pl-9"
        />
      </div>

      {sorted.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {query ? "No members match your search." : "No members yet."}
        </p>
      ) : (
        <div className="divide-y divide-border">
          {sorted.map((m) => {
            const isSelf = m.userId === currentUserId;
            // Disable the dropdown unless the viewer may change THIS row:
            //  • non owner/admin viewers: every box disabled
            //  • owner: everyone except their own row
            //  • admin: everyone except the owner's row (own row allowed)
            const disabled =
              pending === m.userId ||
              !canManage ||
              (callerRole === "owner" && isSelf) ||
              (callerRole === "admin" && m.role === "owner");
            // Always include the row's current role so the value still renders when
            // the option list would otherwise hide it (e.g. admin viewing an owner).
            const options = roleOptions.includes(m.role) ? roleOptions : [m.role, ...roleOptions];
            // Same permission shape as editing a role, minus self (you can't
            // remove yourself here — owners delete the org instead).
            const canRemove =
              canManage && !isSelf && (callerRole === "owner" || m.role !== "owner");
            return (
              <div
                key={m.userId}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-medium text-muted-foreground uppercase">
                    {m.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.avatarUrl} alt="" className="size-full object-cover" />
                    ) : (
                      initials(m.name)
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{m.name}</p>
                      {m.userId === currentUserId ? (
                        <Badge variant="neutral" className="text-[10px]">
                          You
                        </Badge>
                      ) : null}
                    </div>
                    {m.email ? (
                      <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <Mail className="size-3" /> {m.email}
                      </p>
                    ) : null}
                  </div>
                </div>

                <Select
                  value={m.role}
                  onValueChange={(v) => {
                    if (v === REMOVE_VALUE) setRemoveTarget(m);
                    else changeRole(m.userId, v);
                  }}
                  disabled={disabled}
                >
                  <SelectTrigger className="w-36 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABELS[r] ?? r}
                      </SelectItem>
                    ))}
                    {canRemove ? (
                      <>
                        <SelectSeparator />
                        <SelectItem
                          value={REMOVE_VALUE}
                          className="text-destructive focus:text-destructive"
                        >
                          Remove
                        </SelectItem>
                      </>
                    ) : null}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        open={removeTarget !== null}
        onOpenChange={(o) => {
          if (!o) setRemoveTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {removeTarget?.name}?</DialogTitle>
            <DialogDescription>
              They'll lose access to this organization immediately. This doesn't delete their
              account — you can re-add them later with the join key.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)} disabled={removing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemove} disabled={removing}>
              {removing ? <Ring size="sm" className="text-current" /> : "Remove member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
