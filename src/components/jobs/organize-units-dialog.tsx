"use client";

import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Scissors, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import type { WorkUnit } from "@/components/jobs/work-unit-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Ring } from "@/components/ui/ring";
import { reorganizeWorkUnits } from "@/lib/actions/jobs";
import { cn } from "@/lib/utils";

type OrgItem = { id: string; label: string; qty: number | null };
type Section = { id: string; name: string; method: string; itemIds: string[] };

let localSeq = 0;
const localId = (prefix: string) => {
  localSeq += 1;
  return `${prefix}-${localSeq}`;
};

/** Seed sections + the item lookup from the job's current work units. */
function seed(units: WorkUnit[]): { sections: Section[]; items: Map<string, OrgItem> } {
  const items = new Map<string, OrgItem>();
  const sections: Section[] = units.map((u) => {
    const itemIds: string[] = [];
    for (const c of u.checklist) {
      items.set(c.id, { id: c.id, label: c.label, qty: c.qty ?? null });
      itemIds.push(c.id);
    }
    return { id: u.id, name: u.name, method: u.method ?? "", itemIds };
  });
  return { sections, items };
}

/**
 * Smoothly animates its height as the content grows/shrinks — so a section
 * resizing to add/remove a dragged item glides instead of snapping. Measures
 * the inner content via ResizeObserver and transitions the wrapper's height.
 */
function AnimatedHeight({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setHeight(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    // Inline height/transition are dynamic (measured) — can't be static classes.
    <div
      style={{ height, transition: "height 200ms cubic-bezier(0.4, 0, 0.2, 1)" }}
      className="overflow-hidden"
    >
      <div ref={ref}>{children}</div>
    </div>
  );
}

/** Presentational card — used both in the list and the floating drag overlay. */
function ItemCard({ item, overlay }: { item: OrgItem; overlay?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border bg-background px-2.5 py-2 text-sm",
        overlay ? "border-primary shadow-lg ring-1 ring-primary" : "border-border",
      )}
    >
      <GripVertical className="size-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate">{item.label}</span>
      {item.qty ? (
        <span className="shrink-0 text-xs text-muted-foreground">×{item.qty}</span>
      ) : null}
    </div>
  );
}

function SortableItem({ item }: { item: OrgItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  return (
    <div
      ref={setNodeRef}
      // dnd-kit requires inline transform/transition while dragging.
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={cn("touch-none cursor-grab active:cursor-grabbing", isDragging && "opacity-40")}
    >
      <ItemCard item={item} />
    </div>
  );
}

function SectionCard({
  section,
  items,
  canRemove,
  onUpdate,
  onRemove,
}: {
  section: Section;
  items: Map<string, OrgItem>;
  canRemove: boolean;
  onUpdate: (patch: Partial<Section>) => void;
  onRemove: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: section.id });
  const empty = section.itemIds.length === 0;

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-center gap-2">
        <Input
          value={section.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Section name (e.g. Embroidery – hats)"
          className="flex-1"
        />
        <Input
          value={section.method}
          onChange={(e) => onUpdate({ method: e.target.value })}
          placeholder="Method"
          className="w-32"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label="Remove section"
          className="shrink-0 text-muted-foreground"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <SortableContext items={section.itemIds} strategy={verticalListSortingStrategy}>
        <AnimatedHeight>
          <div
            ref={setNodeRef}
            className={cn(
              "space-y-1 rounded-md transition-colors",
              empty && "border border-dashed border-border",
              isOver && "bg-primary/5",
            )}
          >
            {empty ? (
              <p className="px-3 py-5 text-center text-xs text-muted-foreground">Drag items here</p>
            ) : (
              section.itemIds.map((id) => {
                const item = items.get(id);
                return item ? <SortableItem key={id} item={item} /> : null;
              })
            )}
          </div>
        </AnimatedHeight>
      </SortableContext>
    </div>
  );
}

/**
 * Mock-only organizer: drag every item across add/removable sections in one
 * pass — reorder within a section or move between them, with the grabbed card
 * lifting out and the rest sliding aside. No persistence yet; Save reports the
 * resulting partition. Wiring to a reorganize action is next.
 */
export function OrganizeUnitsDialog({ jobId, units }: { jobId: string; units: WorkUnit[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const fresh = seed(units);
  const [items, setItems] = useState<Map<string, OrgItem>>(fresh.items);
  const [sections, setSections] = useState<Section[]>(fresh.sections);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const activeItem = activeId ? (items.get(activeId) ?? null) : null;

  function reset() {
    const next = seed(units);
    setItems(next.items);
    setSections(next.sections);
    setActiveId(null);
  }

  /** Section id that holds a given item id (or the section id itself). */
  function containerOf(id: string): string | undefined {
    if (sections.some((s) => s.id === id)) return id;
    return sections.find((s) => s.itemIds.includes(id))?.id;
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  /** Live cross-section move: pull the item into the section being hovered. */
  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeKey = String(active.id);
    const overKey = String(over.id);
    const from = containerOf(activeKey);
    const to = containerOf(overKey);
    if (!from || !to || from === to) return;

    setSections((prev) => {
      const overSection = prev.find((s) => s.id === to);
      if (!overSection) return prev;
      const overItems = overSection.itemIds;
      const overIsContainer = prev.some((s) => s.id === overKey);

      let newIndex: number;
      if (overIsContainer) {
        newIndex = overItems.length;
      } else {
        const overIndex = overItems.indexOf(overKey);
        const translatedTop = active.rect.current.translated?.top;
        const below =
          translatedTop != null && over.rect
            ? translatedTop > over.rect.top + over.rect.height / 2
            : false;
        newIndex = overIndex >= 0 ? overIndex + (below ? 1 : 0) : overItems.length;
      }

      return prev.map((s) => {
        if (s.id === from) return { ...s, itemIds: s.itemIds.filter((i) => i !== activeKey) };
        if (s.id === to) {
          return {
            ...s,
            itemIds: [...overItems.slice(0, newIndex), activeKey, ...overItems.slice(newIndex)],
          };
        }
        return s;
      });
    });
  }

  /** Commit a within-section reorder; cross-section moves already happened. */
  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;
    const activeKey = String(active.id);
    const overKey = String(over.id);
    const from = containerOf(activeKey);
    const to = containerOf(overKey);
    if (!from || !to || from !== to) return;

    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== from) return s;
        const oldIndex = s.itemIds.indexOf(activeKey);
        const newIndex = overKey === s.id ? s.itemIds.length - 1 : s.itemIds.indexOf(overKey);
        if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return s;
        return { ...s, itemIds: arrayMove(s.itemIds, oldIndex, newIndex) };
      }),
    );
  }

  function addSection() {
    setSections((prev) => [...prev, { id: localId("sec"), name: "", method: "", itemIds: [] }]);
  }

  /** Remove a section; its items fall back into the first remaining section. */
  function removeSection(id: string) {
    setSections((prev) => {
      const removed = prev.find((s) => s.id === id);
      const target = prev.find((s) => s.id !== id);
      if (!removed || !target) return prev.filter((s) => s.id !== id);
      return prev
        .filter((s) => s.id !== id)
        .map((s) =>
          s.id === target.id
            ? {
                ...s,
                itemIds: [...s.itemIds, ...removed.itemIds.filter((i) => !s.itemIds.includes(i))],
              }
            : s,
        );
    });
  }

  function updateSection(id: string, patch: Partial<Section>) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  async function save() {
    const filled = sections.filter((s) => s.itemIds.length > 0);
    if (filled.length === 0) {
      toast.error("Put at least one item in a section");
      return;
    }
    for (const s of filled) {
      if (!s.name.trim()) {
        toast.error("Name every section that has items");
        return;
      }
    }
    setBusy(true);
    const result = await reorganizeWorkUnits(
      jobId,
      filled.map((s) => ({
        id: s.id,
        name: s.name.trim(),
        method: s.method.trim(),
        itemIds: s.itemIds,
      })),
    );
    setBusy(false);
    if (!result.ok) {
      toast.error("Couldn't save work units", { description: result.error });
      return;
    }
    toast.success("Work units updated");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-1.5">
          <Scissors className="size-3.5" /> Split
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Organize work units</DialogTitle>
          <DialogDescription>
            Drag items to reorder them or move them between sections. Add or remove sections as
            needed — multiple items can go in one.
          </DialogDescription>
        </DialogHeader>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {sections.map((section) => (
              <SectionCard
                key={section.id}
                section={section}
                items={items}
                canRemove={sections.length > 1}
                onUpdate={(patch) => updateSection(section.id, patch)}
                onRemove={() => removeSection(section.id)}
              />
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={addSection}
            >
              <Plus className="size-4" /> Add section
            </Button>
          </div>

          {/* Portal to body so the dialog's centering transform doesn't offset
              the overlay's fixed positioning (it would drift off the cursor). */}
          {typeof document !== "undefined"
            ? createPortal(
                <DragOverlay>
                  {activeItem ? <ItemCard item={activeItem} overlay /> : null}
                </DragOverlay>,
                document.body,
              )
            : null}
        </DndContext>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy ? <Ring size="sm" className="text-current" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
