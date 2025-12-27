'use client';

import Image from 'next/image';
import { useState, useTransition } from 'react';

type ImageItem = {
  id: string;
  url: string;
  position: number;
  variantLabel?: string;
};

type Props = {
  images: ImageItem[];
};

export function CatalogImagesList({ images }: Props) {
  const [order, setOrder] = useState(images.slice().sort((a, b) => a.position - b.position));
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function onDragStart(e: React.DragEvent<HTMLDivElement>, id: string) {
    e.dataTransfer.setData('text/plain', id);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>, targetId: string) {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId || draggedId === targetId) return;
    const current = order.slice();
    const from = current.findIndex((i) => i.id === draggedId);
    const to = current.findIndex((i) => i.id === targetId);
    if (from === -1 || to === -1) return;
    const [item] = current.splice(from, 1);
    current.splice(to, 0, item);
    setOrder(current);
  }

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  function saveOrder() {
    startTransition(async () => {
      setMessage(null);
      const ids = order.map((i) => i.id);
      const res = await fetch('/api/admin/catalog/reorder-images', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        setMessage('Falha ao salvar ordenação');
        return;
      }
      setMessage('Ordenação salva');
    });
  }

  return (
    <div className="d-flex flex-column gap-2">
      <div className="d-flex align-items-center gap-2">
        <button className="btn btn-sm btn-outline-primary" onClick={saveOrder} disabled={isPending}>Salvar ordenação</button>
        {message && <span className="text-muted small">{message}</span>}
      </div>
      <div className="d-flex flex-wrap gap-2">
        {order.map((img, idx) => (
          <div
            key={img.id}
            className="border rounded p-2" 
            draggable
            onDragStart={(e) => onDragStart(e, img.id)}
            onDrop={(e) => onDrop(e, img.id)}
            onDragOver={onDragOver}
            style={{ width: 180 }}
          >
            <Image
              src={img.url}
              alt="preview"
              width={180}
              height={120}
              className="img-fluid mb-1"
              style={{ objectFit: 'cover', width: '100%', height: 120 }}
              unoptimized
            />
            <div className="text-muted small">Pos: {idx + 1}</div>
            {img.variantLabel ? <div className="text-muted small">Var: {img.variantLabel}</div> : <div className="text-muted small">Produto</div>}
          </div>
        ))}
        {order.length === 0 && <span className="text-muted small">Sem imagens</span>}
      </div>
    </div>
  );
}
