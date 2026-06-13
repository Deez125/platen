import { Image } from "lucide-react";

import { UnderConstruction } from "@/components/common/under-construction";

export default function ArtworkPage() {
  return (
    <UnderConstruction
      title="Artwork"
      description="Upload, version, and proof artwork for your jobs."
      pageIcon={Image}
    />
  );
}
