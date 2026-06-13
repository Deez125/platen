import { Inbox } from "lucide-react";

import { UnderConstruction } from "@/components/common/under-construction";

export default function InboxPage() {
  return (
    <UnderConstruction
      title="Inbox"
      description="View and triage incoming customer messages."
      pageIcon={Inbox}
    />
  );
}
