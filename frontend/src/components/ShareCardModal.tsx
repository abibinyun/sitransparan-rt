import React, { useEffect, useRef } from 'react';
import { Dialog } from './ui/dialog';
import { Download, MessageCircle } from 'lucide-react';
import { getFileUrl } from '../utils/file';

export interface ShareableAnnouncement {
  id?: string;
  title: string;
  content: string;
  created_at: string;
  image_url?: string;
}

interface ShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcement: ShareableAnnouncement | null;
  tenantName: string;
}

const W = 1080;
const H = 1350;

function drawWrapped(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
): number {
  const words = text.split(/\s+/).filter(Boolean);
  let line = '';
  let lines = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y + lines * lineHeight);
      lines++;
      if (lines >= maxLines) {
        return lines;
      }
      line = word;
    } else {
      line = test;
    }
  }
  if (line && lines < maxLines) {
    ctx.fillText(line, x, y + lines * lineHeight);
    lines++;
  }
  return lines;
}

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

/** Renders the notice-board card onto the canvas at 1080x1350 with optional cover image. */
function renderCard(
  canvas: HTMLCanvasElement,
  announcement: ShareableAnnouncement,
  tenantName: string,
  coverImg?: HTMLImageElement | null
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const ink = '#0F172A';
  const muted = '#64748B';
  const hairline = '#E2E8F0';
  const accent = '#047857';
  const paper = '#FFFFFF';
  const font = 'Inter, ui-sans-serif, system-ui, sans-serif';

  // Backdrop (visible when shared as-is on WhatsApp white theme)
  ctx.fillStyle = '#F1F5F9';
  ctx.fillRect(0, 0, W, H);

  // Card sheet
  const sheetX = 60;
  const sheetY = 96;
  const sheetW = W - 120;
  const sheetH = H - 192;
  ctx.fillStyle = paper;
  ctx.fillRect(sheetX, sheetY, sheetW, sheetH);
  ctx.strokeStyle = hairline;
  ctx.lineWidth = 2;
  ctx.strokeRect(sheetX, sheetY, sheetW, sheetH);

  // Signature: two pinned holes — this card hangs on the RT notice board
  for (const hx of [sheetX + 72, sheetX + sheetW - 72]) {
    ctx.beginPath();
    ctx.arc(hx, sheetY + 56, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#F1F5F9';
    ctx.fill();
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  const padX = sheetX + 84;
  const contentW = sheetW - 168;

  // Letterhead eyebrow
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = accent;
  ctx.font = `700 26px ${font}`;
  ctx.fillText('PAPAN PENGUMUMAN', padX, sheetY + 150);

  ctx.textAlign = 'right';
  ctx.fillStyle = muted;
  ctx.font = `500 26px ${font}`;
  const date = new Date(announcement.created_at).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  ctx.fillText(date.toUpperCase(), sheetX + sheetW - 84, sheetY + 150);
  ctx.textAlign = 'left';

  // Hairline under letterhead
  ctx.strokeStyle = hairline;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(padX, sheetY + 186);
  ctx.lineTo(sheetX + sheetW - 84, sheetY + 186);
  ctx.stroke();

  // Tenant identity
  ctx.fillStyle = muted;
  ctx.font = `600 30px ${font}`;
  ctx.fillText(truncate(tenantName.toUpperCase(), 40), padX, sheetY + 244);

  let curY = sheetY + 310;

  // Draw Cover Image if present and loaded
  if (coverImg && coverImg.complete && coverImg.naturalWidth > 0) {
    const imgH = 380;
    const imgW = contentW;
    const imgX = padX;
    const imgY = curY;

    // Rounded clip for cover image
    ctx.save();
    ctx.beginPath();
    const r = 16;
    ctx.moveTo(imgX + r, imgY);
    ctx.lineTo(imgX + imgW - r, imgY);
    ctx.quadraticCurveTo(imgX + imgW, imgY, imgX + imgW, imgY + r);
    ctx.lineTo(imgX + imgW, imgY + imgH - r);
    ctx.quadraticCurveTo(imgX + imgW, imgY + imgH, imgX + imgW - r, imgY + imgH);
    ctx.lineTo(imgX + r, imgY + imgH);
    ctx.quadraticCurveTo(imgX, imgY + imgH, imgX, imgY + imgH - r);
    ctx.lineTo(imgX, imgY + r);
    ctx.quadraticCurveTo(imgX, imgY, imgX + r, imgY);
    ctx.closePath();
    ctx.clip();

    // Center crop fill image
    const imgAspect = coverImg.naturalWidth / coverImg.naturalHeight;
    const boxAspect = imgW / imgH;
    let sW = coverImg.naturalWidth;
    let sH = coverImg.naturalHeight;
    let sX = 0;
    let sY = 0;

    if (imgAspect > boxAspect) {
      sW = sH * boxAspect;
      sX = (coverImg.naturalWidth - sW) / 2;
    } else {
      sH = sW / boxAspect;
      sY = (coverImg.naturalHeight - sH) / 2;
    }

    ctx.drawImage(coverImg, sX, sY, sW, sH, imgX, imgY, imgW, imgH);
    ctx.restore();

    // Border around image
    ctx.strokeStyle = hairline;
    ctx.lineWidth = 2;
    ctx.strokeRect(imgX, imgY, imgW, imgH);

    curY += imgH + 45;
  }

  // Title
  ctx.fillStyle = ink;
  const hasCover = Boolean(coverImg && coverImg.complete && coverImg.naturalWidth > 0);
  ctx.font = hasCover ? `800 48px ${font}` : `800 62px ${font}`;
  const titleLineHeight = hasCover ? 60 : 74;
  const maxTitleLines = hasCover ? 2 : 4;
  curY += drawWrapped(ctx, announcement.title, padX, curY, contentW, titleLineHeight, maxTitleLines) * titleLineHeight;

  // Excerpt
  ctx.fillStyle = '#334155';
  ctx.font = hasCover ? `400 28px ${font}` : `400 33px ${font}`;
  curY += 34;
  const maxExcerptChars = hasCover ? 220 : 320;
  const maxExcerptLines = hasCover ? 5 : 9;
  const excerptLineHeight = hasCover ? 42 : 50;
  drawWrapped(ctx, truncate(announcement.content, maxExcerptChars), padX, curY, contentW, excerptLineHeight, maxExcerptLines);

  // Footer accent + attribution
  const footY = sheetY + sheetH - 120;
  ctx.fillStyle = accent;
  ctx.fillRect(padX, footY - 34, 64, 8);
  ctx.fillStyle = muted;
  ctx.font = `500 27px ${font}`;
  ctx.fillText(`Dibagikan dari portal transparansi ${tenantName}`, padX, footY + 16);
}

export const ShareCardModal: React.FC<ShareCardModalProps> = ({ isOpen, onClose, announcement, tenantName }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [coverImage, setCoverImage] = React.useState<HTMLImageElement | null>(null);

  // Load cover image if image_url exists
  useEffect(() => {
    if (!announcement?.image_url) {
      setCoverImage(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = getFileUrl(announcement.image_url);
    img.onload = () => {
      setCoverImage(img);
    };
    img.onerror = () => {
      setCoverImage(null);
    };
  }, [announcement?.image_url]);

  const draw = React.useCallback(() => {
    if (canvasRef.current && announcement) {
      renderCard(canvasRef.current, announcement, tenantName, coverImage);
    }
  }, [announcement, tenantName, coverImage]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Draw as soon as the canvas attaches — portal content (Radix) may mount
  // after the parent's effects have already run for this commit.
  const attachCanvas = (el: HTMLCanvasElement | null) => {
    canvasRef.current = el;
    if (el) draw();
  };

  if (!announcement) return null;

  const getCanvasBlob = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) return resolve(null);
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  };

  const downloadPng = async () => {
    const blob = await getCanvasBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pengumuman-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const shareWhatsApp = async () => {
    const postUrl = announcement.id
      ? `${window.location.origin}/kabar?id=${announcement.id}`
      : `${window.location.origin}/kabar`;
    const summary = `*${announcement.title}*\n\n${truncate(announcement.content, 220)}\n\nBaca selengkapnya di: ${postUrl}\n\n- ${tenantName}`;

    // Cek apakah browser HP mendukung Web Share API file transfer (bisa kirim gambar PNG langsung)
    const blob = await getCanvasBlob();
    if (blob && navigator.canShare && window.File) {
      try {
        const file = new File([blob], `pengumuman-${Date.now()}.png`, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: announcement.title,
            text: summary,
            files: [file],
          });
          return;
        }
      } catch (err: any) {
        // User membatalkan dialog share atau browser menolak file share
        if (err.name === 'AbortError') return;
      }
    }

    // Fallback direct WhatsApp Web / App link
    window.open(`https://wa.me/?text=${encodeURIComponent(summary)}`, '_blank', 'noopener');
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Bagikan ke WhatsApp"
      description="Kartu siap-unduh untuk dibagikan ke grup RT"
      className="w-[96vw] sm:w-[92vw] max-w-2xl"
    >
      <div className="space-y-4">
        <canvas
          ref={attachCanvas}
          width={W}
          height={H}
          className="w-full rounded-lg border border-[#d2d2d7] bg-[#f5f5f7]"
          aria-label={`Pratinjau kartu pengumuman: ${announcement.title}`}
        />
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={downloadPng}
            className="flex-1 apple-btn-secondary text-xs py-2.5 px-4 flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4 text-[#0066cc]" /> Unduh PNG
          </button>
          <button
            onClick={shareWhatsApp}
            className="flex-1 apple-btn-primary text-xs py-2.5 px-4 flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4 text-white" /> Buka WhatsApp
          </button>
        </div>
      </div>
    </Dialog>
  );
};
