import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Dialog } from './ui/dialog';
import { Download, MessageCircle, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { getFileUrl } from '../utils/file';

export interface ShareableAnnouncement {
  id?: string;
  title: string;
  content: string;
  created_at: string;
  image_url?: string;
  image_urls?: string[];
  attachment_url?: string;
  media_urls?: string[];
}

export function isImageFile(url?: string | null): boolean {
  if (!url) return false;
  return /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(url) || url.includes('/proofs/') || url.includes('/files/');
}

export interface ImageFitBox {
  destX: number;
  destY: number;
  destW: number;
  destH: number;
  isPortrait: boolean;
}

/** Menghitung ukuran dan posisi fit (contain) di tengah container tanpa memotong rasio asli gambar */
export function calculateImageFitBox(
  srcW: number,
  srcH: number,
  boxW: number,
  boxH: number
): ImageFitBox {
  const imgAspect = srcW / srcH;
  const boxAspect = boxW / boxH;

  let destW = boxW;
  let destH = boxH;

  if (imgAspect < boxAspect) {
    // Gambar lebih portrait dibanding container: fit berdasarkan tinggi container
    destH = boxH;
    destW = Math.round(boxH * imgAspect);
  } else {
    // Gambar lebih landscape dibanding container: fit berdasarkan lebar container
    destW = boxW;
    destH = Math.round(boxW / imgAspect);
  }

  const destX = Math.round((boxW - destW) / 2);
  const destY = Math.round((boxH - destH) / 2);

  return {
    destX,
    destY,
    destW,
    destH,
    isPortrait: imgAspect < 1.0,
  };
}

/** Mengumpulkan seluruh foto pengumuman (gabungan attachment_url gambar + seluruh media_urls) tanpa duplikasi */
export function extractAllPhotos(item?: {
  attachment_url?: string;
  media_urls?: string[];
  image_url?: string;
  image_urls?: string[];
}): string[] {
  if (!item) return [];
  const list: string[] = [];

  // 1. attachment_url jika berupa gambar
  if (item.attachment_url && isImageFile(item.attachment_url)) {
    list.push(item.attachment_url);
  }

  // 2. media_urls
  if (item.media_urls && Array.isArray(item.media_urls)) {
    for (const u of item.media_urls) {
      if (u && !list.includes(u)) {
        list.push(u);
      }
    }
  }

  // 3. image_urls legacy/direct
  if (item.image_urls && Array.isArray(item.image_urls)) {
    for (const u of item.image_urls) {
      if (u && !list.includes(u)) {
        list.push(u);
      }
    }
  }

  // 4. image_url single
  if (item.image_url && !list.includes(item.image_url)) {
    list.push(item.image_url);
  }

  return list;
}

interface ShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcement: ShareableAnnouncement | null;
  tenantName: string;
}

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

// Bounding box area kertas putih kartu di dalam canvas
export const CARD_SHEET = {
  x: 60,
  y: 96,
  width: CARD_WIDTH - 120, // 960
  height: CARD_HEIGHT - 192, // 1158
};

const W = CARD_WIDTH;
const H = CARD_HEIGHT;

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

  // Draw Cover Image if present and loaded with contain/fit + blurred backdrop
  if (coverImg && coverImg.complete && coverImg.naturalWidth > 0) {
    const imgH = 380;
    const imgW = contentW;
    const imgX = padX;
    const imgY = curY;

    // Rounded clip for entire cover container box
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

    // 1. Background Fill: Gambar di-zoom mengisi box + blur lembut
    ctx.save();
    try {
      (ctx as any).filter = 'blur(16px)';
    } catch {}
    ctx.drawImage(coverImg, imgX - 10, imgY - 10, imgW + 20, imgH + 20);
    // Darkening overlay di atas blur agar kontras foto tengah menonjol
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.fillRect(imgX, imgY, imgW, imgH);
    ctx.restore();

    // 2. Foreground Fit: Gambar asli di-render utuh di tengah tanpa terpotong
    const fitBox = calculateImageFitBox(coverImg.naturalWidth, coverImg.naturalHeight, imgW, imgH);
    ctx.drawImage(
      coverImg,
      0,
      0,
      coverImg.naturalWidth,
      coverImg.naturalHeight,
      imgX + fitBox.destX,
      imgY + fitBox.destY,
      fitBox.destW,
      fitBox.destH
    );

    ctx.restore();

    // Border container
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
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [coverImage, setCoverImage] = useState<HTMLImageElement | null>(null);

  // Kumpulkan semua foto kandidat cover (dari attachment_url, media_urls, atau image_urls)
  const availablePhotos = useMemo(() => {
    return extractAllPhotos(announcement || undefined);
  }, [announcement]);

  // Reset index saat announcement berganti
  useEffect(() => {
    setSelectedPhotoIndex(0);
  }, [announcement?.id]);

  // Load cover image yang sedang dipilih pengguna
  useEffect(() => {
    const activeUrl = availablePhotos[selectedPhotoIndex];
    if (!activeUrl) {
      setCoverImage(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = getFileUrl(activeUrl);
    img.onload = () => {
      setCoverImage(img);
    };
    img.onerror = () => {
      setCoverImage(null);
    };
  }, [availablePhotos, selectedPhotoIndex]);

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

  const getCanvasBlob = (cropCleanSheet = false): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) return resolve(null);

      // Jika cropCleanSheet = true, potong kartu putih tanpa outer frame backdrop
      if (cropCleanSheet) {
        const offscreen = document.createElement('canvas');
        offscreen.width = CARD_SHEET.width;
        offscreen.height = CARD_SHEET.height;
        const oCtx = offscreen.getContext('2d');
        if (!oCtx) {
          canvas.toBlob((blob) => resolve(blob), 'image/png');
          return;
        }

        // Ambil area persis kertas kartu putih dari canvas pratinjau
        oCtx.drawImage(
          canvas,
          CARD_SHEET.x,
          CARD_SHEET.y,
          CARD_SHEET.width,
          CARD_SHEET.height,
          0,
          0,
          CARD_SHEET.width,
          CARD_SHEET.height
        );
        offscreen.toBlob((blob) => resolve(blob), 'image/png');
        return;
      }

      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  };

  const downloadPng = async () => {
    // Unduh versi bersih (tanpa outer frame biru/abu-abu)
    const blob = await getCanvasBlob(true);
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

    // Cek apakah browser HP mendukung Web Share API file transfer (bisa kirim gambar PNG bersih langsung)
    const blob = await getCanvasBlob(true);
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
        {/* Photo Selector Slider jika postingan memiliki lebih dari 1 foto */}
        {availablePhotos.length > 1 && (
          <div className="p-3 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#1d1d1f] flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-[#0071e3]" />
                Pilih Foto Sampul Kartu:
              </span>
              <span className="text-[11px] font-medium text-[#707070]">
                Foto {selectedPhotoIndex + 1} dari {availablePhotos.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setSelectedPhotoIndex(
                    (prev) => (prev - 1 + availablePhotos.length) % availablePhotos.length
                  )
                }
                className="p-1.5 rounded-lg border border-[#d2d2d7] bg-white text-[#707070] hover:text-[#1d1d1f] hover:bg-slate-50 transition shrink-0"
                title="Foto Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 flex-1">
                {availablePhotos.map((photoUrl, idx) => {
                  const isSelected = idx === selectedPhotoIndex;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedPhotoIndex(idx)}
                      className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 transition shrink-0 ${
                        isSelected
                          ? 'border-[#0071e3] ring-2 ring-[#0071e3]/20 scale-105'
                          : 'border-[#d2d2d7] opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={getFileUrl(photoUrl)}
                        alt={`Pilihan foto ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedPhotoIndex((prev) => (prev + 1) % availablePhotos.length)
                }
                className="p-1.5 rounded-lg border border-[#d2d2d7] bg-white text-[#707070] hover:text-[#1d1d1f] hover:bg-slate-50 transition shrink-0"
                title="Foto Selanjutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

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
