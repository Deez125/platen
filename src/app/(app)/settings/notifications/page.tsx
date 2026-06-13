import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const notificationChannels = [
  {
    title: "Quote activity",
    description: "When a customer views, approves, or declines a quote you sent.",
  },
  {
    title: "Payment received",
    description: "When a customer pays an invoice in full or in part.",
  },
  {
    title: "Job status changes",
    description: "When a job moves between production stages.",
  },
  {
    title: "Team activity",
    description: "When a teammate joins, leaves, or changes role.",
  },
];

export default function NotificationSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Notifications</h2>
        <p className="text-sm text-muted-foreground">
          Choose which events trigger a notification, and where they land.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email</CardTitle>
          <CardDescription>
            Receive notifications at the email address on your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {notificationChannels.map((channel) => (
            <div
              key={channel.title}
              className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
            >
              <div className="pr-4">
                <p className="text-sm font-medium">{channel.title}</p>
                <p className="text-xs text-muted-foreground">{channel.description}</p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="size-4 cursor-pointer"
                aria-label={`Toggle ${channel.title}`}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
