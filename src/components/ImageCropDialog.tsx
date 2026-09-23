import { useEffect, useRef, useState } from 'react';
import { Check, Move, X, ZoomIn, ZoomOut } from 'lucide-react';

type ImageCropDialogProps = {
  file: File;
  onCancel: () => void;
  onConfirm: (file: File) => void;
};

const VIEW_WIDTH = 320;
const VIEW_HEIGHT = 220;

export default function ImageCropDialog({ file, onCancel, onConfirm }: ImageCropDialogProps) {
  const [sourceUrl, setSourceUrl] = useState('');
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSourceUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const baseScale = imageSize.width && imageSize.height
    ? Math.max(VIEW_WIDTH / imageSize.width, VIEW_HEIGHT / imageSize.height)
    : 1;
  const scale = baseScale * zoom;
  const imageWidth = imageSize.width * scale;
  const imageHeight = imageSize.height * scale;
  const left = (VIEW_WIDTH - imageWidth) / 2 + offset.x;
  const top = (VIEW_HEIGHT - imageHeight) / 2 + offset.y;

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = { x: event.clientX - offset.x, y: event.clientY - offset.y };
    setDragging(true);
  };

  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setOffset({ x: event.clientX - dragStart.current.x, y: event.clientY - dragStart.current.y });
  };

  const stopDrag = () => setDragging(false);

  const confirm = () => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = Math.round(1200 * VIEW_HEIGHT / VIEW_WIDTH);
      const sourceX = Math.max(0, Math.min(image.naturalWidth - VIEW_WIDTH / scale, -left / scale));
      const sourceY = Math.max(0, Math.min(image.naturalHeight - VIEW_HEIGHT / scale, -top / scale));
      const sourceWidth = Math.min(image.naturalWidth, VIEW_WIDTH / scale);
      const sourceHeight = Math.min(image.naturalHeight, VIEW_HEIGHT / scale);
      const context = canvas.getContext('2d');
      if (!context) return;
      context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        if (blob) onConfirm(new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.9);
    };
    image.src = sourceUrl;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-navy dark:text-white text-lg">Crop Image</h2>
          <button type="button" onClick={onCancel} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <p className="text-xs text-slate-500 mb-3">Drag the image to position it, then adjust the zoom before confirming.</p>
        <div
          className={`mx-auto overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-700 touch-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{ width: VIEW_WIDTH, height: VIEW_HEIGHT }}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
        >
          {sourceUrl && <img src={sourceUrl} alt="Crop preview" onLoad={event => setImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} className="max-w-none select-none pointer-events-none" style={{ width: imageWidth, height: imageHeight, transform: `translate(${left}px, ${top}px)` }} />}
        </div>
        <div className="flex items-center gap-3 mt-5">
          <ZoomOut className="w-4 h-4 text-slate-400" />
          <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={event => setZoom(Number(event.target.value))} className="flex-1 accent-navy" aria-label="Image zoom" />
          <ZoomIn className="w-4 h-4 text-slate-400" />
        </div>
        <div className="flex items-center justify-between mt-5">
          <span className="flex items-center gap-1.5 text-xs text-slate-400"><Move className="w-3.5 h-3.5" />Drag to pan</span>
          <div className="flex gap-2">
            <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl text-xs font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">Cancel</button>
            <button type="button" onClick={confirm} disabled={!imageSize.width} className="flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50"><Check className="w-4 h-4" />Confirm</button>
          </div>
        </div>
      </div>
    </div>
  );
}