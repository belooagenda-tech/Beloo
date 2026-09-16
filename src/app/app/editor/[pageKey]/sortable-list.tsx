"use client";

import type { ReactNode } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Lista genérica com arrastar-para-reordenar, adicionar e remover — usada
// pelos itens de Público, Como Funciona e Funcionalidades no editor da
// landing. Sempre um item do mesmo "molde" (T já vem com o shape do card);
// nunca HTML livre.
export function SortableList<T extends { id: string }>({
  items,
  onChange,
  onAdd,
  addLabel,
  renderItem,
  maxItems = 24,
  minItems = 0,
  footer,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  // Omita onAdd/addLabel quando o botão de adicionar for renderizado fora
  // (ex. duas opções de "adicionar" diferentes, como texto vs imagem — ver
  // blocks-editor.tsx) e passe esses botões em `footer`.
  onAdd?: () => void;
  addLabel?: string;
  renderItem: (item: T, onChangeItem: (next: T) => void) => ReactNode;
  maxItems?: number;
  minItems?: number;
  footer?: ReactNode;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(items, oldIndex, newIndex));
  }

  return (
    <div className="space-y-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <SortableRow
              key={item.id}
              id={item.id}
              onRemove={() => onChange(items.filter((i) => i.id !== item.id))}
              removeDisabled={items.length <= minItems}
            >
              {renderItem(item, (next) => onChange(items.map((i) => (i.id === item.id ? next : i))))}
            </SortableRow>
          ))}
        </SortableContext>
      </DndContext>
      {footer ??
        (onAdd ? (
          <Button type="button" variant="outline" size="sm" disabled={items.length >= maxItems} onClick={onAdd}>
            {addLabel}
          </Button>
        ) : null)}
    </div>
  );
}

function SortableRow({
  id,
  onRemove,
  removeDisabled,
  children,
}: {
  id: string;
  onRemove: () => void;
  removeDisabled: boolean;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 rounded-lg border border-border bg-card p-3"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="mt-1 shrink-0 touch-none text-muted-foreground hover:text-foreground"
        aria-label="Arrastar para reordenar"
      >
        <GripVertical className="size-4" />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={removeDisabled}
        onClick={onRemove}
        aria-label="Remover item"
        className="shrink-0"
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
