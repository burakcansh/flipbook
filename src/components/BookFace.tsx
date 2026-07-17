"use client";

import { useEffect, useRef, useState } from "react";
import type {
  BookCover,
  BookPage,
  LinkItem,
  TextBlock,
  VideoMeta,
} from "@/lib/types";
import type { Theme } from "@/lib/themes";
import { SocialIcon } from "@/lib/socialIcons";
import { getTextBlocks } from "@/lib/textBlocks";

/** Fixed design canvas — the page is drawn at this size then scaled to fit,
 * so the editor preview and the published viewer are pixel-identical. */
const DESIGN_W = 300;
const DESIGN_H = 400;

export type FaceContent =
  | { type: "cover"; cover: BookCover }
  | { type: "page"; page: BookPage; pageNumber: number; isEnd?: boolean }
  | { type: "back-cover" }
  | { type: "blank" };

/** Props threaded through so the live-preview can drag-position blocks. */
interface EditProps {
  editable?: boolean;
  onImageMove?: (x: number, y: number) => void;
  onImageResize?: (size: number) => void;
  onTextMove?: (id: string, x: number, y: number) => void;
  onTextResize?: (id: string, w: number) => void;
  onCaptionMove?: (x: number, y: number) => void;
  onVideoMove?: (x: number, y: number) => void;
  onVideoResize?: (size: number) => void;
  onLinkMove?: (id: string, x: number, y: number) => void;
  onLinkResize?: (id: string, size: number) => void;
  onCommit?: () => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** A block that can be dragged to reposition and (optionally) resized. */
function DraggableBlock({
  x,
  y,
  w,
  editable,
  onMove,
  onResize,
  onCommit,
  containerRef,
  className,
  children,
}: {
  x: number;
  y: number;
  w: number;
  editable?: boolean;
  onMove?: (x: number, y: number) => void;
  /** if provided and editable, a corner handle resizes the block (width %) */
  onResize?: (size: number) => void;
  onCommit?: () => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
  children: React.ReactNode;
}) {
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(
    null
  );
  const rez = useRef<{ sx: number; base: number } | null>(null);

  const down = (e: React.PointerEvent) => {
    if (!editable) return;
    e.stopPropagation();
    e.preventDefault();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    drag.current = { sx: e.clientX, sy: e.clientY, ox: x, oy: y };
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    const el = containerRef?.current;
    if (!d || !el) return;
    const r = el.getBoundingClientRect();
    const nx = clamp(
      d.ox + ((e.clientX - d.sx) / r.width) * 100,
      0,
      Math.max(0, 100 - w)
    );
    const ny = clamp(d.oy + ((e.clientY - d.sy) / r.height) * 100, 0, 96);
    onMove?.(nx, ny);
  };
  const up = (e: React.PointerEvent) => {
    if (!drag.current) return;
    drag.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    onCommit?.();
  };

  const rezDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    rez.current = { sx: e.clientX, base: w };
  };
  const rezMove = (e: React.PointerEvent) => {
    const r0 = rez.current;
    const el = containerRef?.current;
    if (!r0 || !el) return;
    const r = el.getBoundingClientRect();
    const next = clamp(r0.base + ((e.clientX - r0.sx) / r.width) * 100, 15, 100);
    onResize?.(next);
  };
  const rezUp = (e: React.PointerEvent) => {
    if (!rez.current) return;
    rez.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    onCommit?.();
  };

  return (
    <div
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      className={className}
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        width: `${w}%`,
        touchAction: editable ? "none" : undefined,
        cursor: editable ? "move" : undefined,
      }}
    >
      {children}
      {editable && onResize && (
        <span
          onPointerDown={rezDown}
          onPointerMove={rezMove}
          onPointerUp={rezUp}
          onPointerCancel={rezUp}
          title="Boyutlandır"
          className="absolute -bottom-2 -right-2 z-10 flex h-5 w-5 cursor-nwse-resize items-center justify-center rounded-full border border-white bg-amber-600 text-[9px] text-white"
          style={{ touchAction: "none" }}
        >
          ⤡
        </span>
      )}
    </div>
  );
}

/** Independent, draggable caption block. */
function CaptionFace({
  page,
  theme,
  editable,
  onCaptionMove,
  onCommit,
  containerRef,
}: { page: BookPage; theme: Theme } & EditProps) {
  if (!page.caption) return null;
  const x = page.captionX ?? 8;
  const y = page.captionY ?? 86;
  return (
    <DraggableBlock
      x={x}
      y={y}
      w={84}
      editable={editable}
      onMove={onCaptionMove}
      onCommit={onCommit}
      containerRef={containerRef}
      className={
        editable
          ? "rounded-md p-1 ring-2 ring-sky-400/50 transition hover:ring-sky-400"
          : undefined
      }
    >
      <div
        className="text-center text-sm italic"
        style={{ color: theme.colors.inkSoft, fontFamily: theme.fonts.body }}
      >
        {page.caption}
      </div>
    </DraggableBlock>
  );
}

/** A single clickable, draggable + resizable logo link. */
function LinkBadge({
  link,
  editable,
  onLinkMove,
  onLinkResize,
  onCommit,
  containerRef,
}: { link: LinkItem } & EditProps) {
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(
    null
  );
  const resize = useRef<{ sx: number; base: number } | null>(null);

  const moveDown = (e: React.PointerEvent) => {
    if (!editable) return;
    e.stopPropagation();
    e.preventDefault();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    drag.current = { sx: e.clientX, sy: e.clientY, ox: link.x, oy: link.y };
  };
  const moveMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const el = containerRef?.current;
    if (!d || !el) return;
    const r = el.getBoundingClientRect();
    const nx = clamp(
      d.ox + ((e.clientX - d.sx) / r.width) * 100,
      0,
      100 - link.size
    );
    const ny = clamp(d.oy + ((e.clientY - d.sy) / r.height) * 100, 0, 96);
    onLinkMove?.(link.id, nx, ny);
  };
  const moveUp = (e: React.PointerEvent) => {
    if (!drag.current) return;
    drag.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    onCommit?.();
  };

  const resizeDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    resize.current = { sx: e.clientX, base: link.size };
  };
  const resizeMove = (e: React.PointerEvent) => {
    const r0 = resize.current;
    const el = containerRef?.current;
    if (!r0 || !el) return;
    const r = el.getBoundingClientRect();
    const next = clamp(
      r0.base + ((e.clientX - r0.sx) / r.width) * 100,
      4,
      40
    );
    onLinkResize?.(link.id, next);
  };
  const resizeUp = (e: React.PointerEvent) => {
    if (!resize.current) return;
    resize.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    onCommit?.();
  };

  const logo =
    link.platform === "custom" ? (
      link.iconSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={link.iconSrc}
          alt=""
          draggable={false}
          className="block h-full w-full object-contain"
          style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.25))" }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-full bg-gray-800 text-white">
          ↗
        </div>
      )
    ) : (
      <SocialIcon platform={link.platform} />
    );

  const commonStyle: React.CSSProperties = {
    position: "absolute",
    left: `${link.x}%`,
    top: `${link.y}%`,
    width: `${link.size}%`,
    aspectRatio: "1 / 1",
  };

  if (!editable) {
    return (
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        onPointerDown={(e) => e.stopPropagation()}
        style={commonStyle}
        className="transition-transform hover:scale-110"
      >
        {logo}
      </a>
    );
  }

  return (
    <div
      onPointerDown={moveDown}
      onPointerMove={moveMove}
      onPointerUp={moveUp}
      onPointerCancel={moveUp}
      style={{ ...commonStyle, touchAction: "none", cursor: "move" }}
      className="rounded ring-2 ring-emerald-400/50 hover:ring-emerald-400"
    >
      {logo}
      <span
        onPointerDown={resizeDown}
        onPointerMove={resizeMove}
        onPointerUp={resizeUp}
        onPointerCancel={resizeUp}
        title="Boyutlandır"
        className="absolute -bottom-1.5 -right-1.5 h-4 w-4 cursor-nwse-resize rounded-full border border-white bg-emerald-500"
        style={{ touchAction: "none" }}
      />
    </div>
  );
}

function LinksLayer(props: { page: BookPage } & EditProps) {
  const links = props.page.links;
  if (!links || links.length === 0) return null;
  return (
    <>
      {links.map((link) => (
        <LinkBadge key={link.id} link={link} {...props} />
      ))}
    </>
  );
}

function embedUrl(v: VideoMeta): string {
  if (v.provider === "youtube") {
    return `https://www.youtube.com/embed/${v.videoId}?autoplay=1&rel=0&playsinline=1`;
  }
  return `https://player.vimeo.com/video/${v.videoId}?autoplay=1`;
}

function watchUrl(v: VideoMeta): string {
  if (v.provider === "youtube") {
    return `https://www.youtube.com/watch?v=${v.videoId}`;
  }
  return v.url || `https://vimeo.com/${v.videoId}`;
}

function VideoFace({
  page,
  theme,
  editable,
  onVideoMove,
  onVideoResize,
  onCommit,
  containerRef,
  forceFree,
  active = true,
}: {
  page: BookPage;
  theme: Theme;
  forceFree?: boolean;
  active?: boolean;
} & EditProps) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = true;
    // only decode/play the video while its page is on screen
    if (active) el.play().catch(() => {});
    else el.pause();
  }, [active]);
  const v = page.video;
  if (!v) return null;

  const widthPct = Math.round(clamp(v.scale ?? 0.7, 0.2, 1) * 100);
  const hasPos = v.x != null && v.y != null;

  const frame = (
    <div
      className="relative w-full overflow-hidden rounded-md"
      // In edit mode let the drag reach the block; in the viewer keep the
      // video controls (and stop the page-flip from starting on the video).
      onPointerDown={(e) => {
        if (!editable) e.stopPropagation();
      }}
      onClick={(e) => {
        if (!editable) e.stopPropagation();
      }}
      style={{
        aspectRatio: "16 / 9",
        background: "#000",
        border: `1px solid ${theme.colors.paperEdge}`,
      }}
    >
      {v.provider === "local" ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          ref={videoRef}
          src={v.url}
          poster={v.thumbnail || undefined}
          controls
          playsInline
          muted
          loop
          preload="metadata"
          className="absolute inset-0 h-full w-full bg-black object-contain"
        />
      ) : playing ? (
        <iframe
          src={embedUrl(v)}
          title={v.title}
          className="absolute inset-0 h-full w-full"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 block h-full w-full"
          aria-label="Videoyu oynat"
        >
          {v.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={v.thumbnail}
              alt={v.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-white/70">
              {v.provider} videosu
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full transition-transform group-hover:scale-110"
              style={{ background: "rgba(0,0,0,0.6)" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </button>
      )}
    </div>
  );

  const watchLink =
    v.provider !== "local" ? (
      <a
        href={watchUrl(v)}
        target="_blank"
        rel="noopener noreferrer"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="mt-1 inline-flex items-center gap-1 self-start text-xs font-medium underline-offset-2 hover:underline"
        style={{ color: theme.colors.accent }}
      >
        {v.provider === "youtube" ? "YouTube'da izle" : "Vimeo'da izle"} ↗
      </a>
    ) : null;

  const inner = (
    <div className="flex flex-col">
      {frame}
      {watchLink}
    </div>
  );

  if (editable || hasPos || forceFree) {
    const x = v.x ?? 10;
    const y = v.y ?? 18;
    return (
      <DraggableBlock
        x={x}
        y={y}
        w={widthPct}
        editable={editable}
        onMove={onVideoMove}
        onResize={onVideoResize}
        onCommit={onCommit}
        containerRef={containerRef}
        className={
          editable
            ? "rounded-md ring-2 ring-fuchsia-400/50 transition hover:ring-fuchsia-400"
            : undefined
        }
      >
        {inner}
      </DraggableBlock>
    );
  }

  return (
    <div className="flex h-full flex-col justify-center gap-2">{inner}</div>
  );
}

function ImageFace({
  page,
  theme,
  editable,
  onImageMove,
  onImageResize,
  onCommit,
  containerRef,
  forceFree,
}: { page: BookPage; theme: Theme; forceFree?: boolean } & EditProps) {
  const im = page.image;
  if (!im?.src) return null;
  const widthPct = Math.round(clamp(im.scale || 1, 0.2, 1) * 100);
  const hasPos = im.x != null && im.y != null;

  const inner = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={im.src}
      alt={im.alt || ""}
      draggable={false}
      className="block w-full rounded-md object-contain"
      style={{
        border: `1px solid ${theme.colors.paperEdge}`,
        boxShadow: "0 6px 18px -10px rgba(0,0,0,0.5)",
      }}
    />
  );

  // Free positioned (or being edited) → absolute draggable block.
  if (editable || hasPos || forceFree) {
    const defX =
      im.align === "right"
        ? Math.max(0, 92 - widthPct)
        : im.align === "left"
        ? 8
        : Math.max(0, (100 - widthPct) / 2);
    const x = im.x ?? defX;
    const y = im.y ?? 20;
    return (
      <DraggableBlock
        x={x}
        y={y}
        w={widthPct}
        editable={editable}
        onMove={onImageMove}
        onResize={onImageResize}
        onCommit={onCommit}
        containerRef={containerRef}
        className={
          editable
            ? "rounded-md ring-2 ring-amber-500/50 transition hover:ring-amber-500"
            : undefined
        }
      >
        {inner}
      </DraggableBlock>
    );
  }

  // Default flow layout.
  const justify =
    im.align === "left"
      ? "flex-start"
      : im.align === "right"
      ? "flex-end"
      : "center";
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-1 items-center" style={{ justifyContent: justify }}>
        <div style={{ width: `${widthPct}%` }}>{inner}</div>
      </div>
    </div>
  );
}

/** Renders inline **bold** and _italic_ markers. */
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g);
  return parts.map((p, i) => {
    const b = /^\*\*([^*]+)\*\*$/.exec(p);
    if (b) return <strong key={i}>{b[1]}</strong>;
    const it = /^_([^_]+)_$/.exec(p);
    if (it) return <em key={i}>{it[1]}</em>;
    return <span key={i}>{p}</span>;
  });
}

function TextBlockFace({
  block,
  index,
  theme,
  editable,
  onTextMove,
  onTextResize,
  onCommit,
  containerRef,
}: {
  block: TextBlock;
  index: number;
  theme: Theme;
} & EditProps) {
  const font = block.fontFamily || theme.fonts.body;
  const color = block.color || theme.colors.ink;
  const size = block.fontSize || 15;

  const inner = (
    <p
      className="whitespace-pre-wrap leading-relaxed"
      style={{ color, fontFamily: font, fontSize: `${size}px` }}
    >
      {block.body ? (
        renderInline(block.body)
      ) : (
        <span style={{ color: theme.colors.inkSoft }} className="italic">
          (boş metin)
        </span>
      )}
    </p>
  );

  const x = block.x ?? 6;
  const y = block.y ?? 6 + index * 6;
  const w = block.w ?? 84;

  return (
    <DraggableBlock
      x={x}
      y={y}
      w={w}
      editable={editable}
      onMove={(nx, ny) => onTextMove?.(block.id, nx, ny)}
      onResize={(nw) => onTextResize?.(block.id, nw)}
      onCommit={onCommit}
      containerRef={containerRef}
      className={
        editable
          ? "rounded-md p-1 ring-2 ring-amber-500/50 transition hover:ring-amber-500"
          : undefined
      }
    >
      {inner}
    </DraggableBlock>
  );
}

function PageBody({
  page,
  theme,
  active,
  ...edit
}: { page: BookPage; theme: Theme; active?: boolean } & EditProps) {
  const blocks = getTextBlocks(page);

  // Everything is free-positioned (absolute) so blocks never overlap-lock.
  return (
    <>
      {blocks.map((b, i) => (
        <TextBlockFace
          key={b.id}
          block={b}
          index={i}
          theme={theme}
          {...edit}
        />
      ))}
      {page.image?.src && (
        <ImageFace page={page} theme={theme} {...edit} forceFree />
      )}
      {page.video && (
        <VideoFace
          page={page}
          theme={theme}
          {...edit}
          forceFree
          active={active}
        />
      )}
      <CaptionFace page={page} theme={theme} {...edit} />
      <LinksLayer page={page} {...edit} />
    </>
  );
}

function coverGradient(t: Theme): string {
  const c = t.colors.cover;
  switch (t.style.coverStyle) {
    case "classic":
      return `linear-gradient(135deg, #7a2531 0%, ${c} 55%, #3d141a 100%)`;
    case "artdeco":
      return `linear-gradient(160deg, #1d1915 0%, ${c} 55%, #000000 100%)`;
    case "botanic":
      return `linear-gradient(150deg, #2d4f39 0%, ${c} 55%, #132417 100%)`;
    case "midnight":
      return `radial-gradient(120% 90% at 30% 12%, #2b3163 0%, ${c} 52%, #090b20 100%)`;
    case "linen":
      return `linear-gradient(150deg, #f0e8d6 0%, ${c} 52%, #d7c9ad 100%)`;
    case "ottoman":
      return `radial-gradient(120% 95% at 50% 42%, #5b3720 0%, ${c} 60%, #281509 100%)`;
    case "modern":
      return `linear-gradient(160deg, ${c} 0%, #1e293b 100%)`;
    case "ornate":
    default:
      return `linear-gradient(135deg, ${c} 0%, #4a2e1b 100%)`;
  }
}

function coverFrame(t: Theme, hasImage: boolean): React.ReactNode {
  const c = t.colors;
  const a = c.coverAccent;
  const s = t.style.coverStyle;

  if (s === "modern") {
    return hasImage ? null : (
      <div
        className="pointer-events-none absolute left-0 top-0 h-full w-1.5"
        style={{ background: a }}
      />
    );
  }
  if (s === "artdeco") {
    return (
      <div
        className="pointer-events-none absolute inset-4"
        style={{ border: `1px solid ${a}` }}
      >
        <div
          className="absolute inset-[5px]"
          style={{
            borderTop: `3px double ${a}`,
            borderBottom: `3px double ${a}`,
            opacity: 0.75,
          }}
        />
      </div>
    );
  }
  if (s === "midnight") {
    const stars = [
      [18, 22],
      [76, 16],
      [30, 80],
      [84, 68],
      [55, 40],
      [64, 86],
    ];
    return (
      <>
        <div
          className="pointer-events-none absolute inset-4 rounded"
          style={{ border: `1px solid ${a}`, opacity: 0.5 }}
        />
        {stars.map(([x, y], i) => (
          <span
            key={i}
            className="pointer-events-none absolute"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              color: a,
              opacity: 0.75,
              fontSize: i % 2 ? 8 : 11,
            }}
          >
            ✦
          </span>
        ))}
      </>
    );
  }
  if (s === "linen") {
    return (
      <div
        className="pointer-events-none absolute inset-4"
        style={{ border: `1px solid ${a}`, opacity: 0.55 }}
      />
    );
  }
  if (s === "ottoman") {
    const corner = (cx: number, cy: number) => (
      <g key={`${cx}-${cy}`} opacity={0.9}>
        <rect x={cx - 11} y={cy - 11} width={22} height={22} strokeWidth={1.4} />
        <rect
          x={cx - 11}
          y={cy - 11}
          width={22}
          height={22}
          strokeWidth={1.4}
          transform={`rotate(45 ${cx} ${cy})`}
        />
        <circle cx={cx} cy={cy} r={3} fill={a} stroke="none" />
      </g>
    );
    return (
      <>
        {/* filigree lattice over the leather */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, rgba(184,146,63,0.09) 0 1px, transparent 1px 14px), repeating-linear-gradient(-45deg, rgba(184,146,63,0.09) 0 1px, transparent 1px 14px)",
          }}
        />
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 300 400"
          preserveAspectRatio="none"
          fill="none"
          stroke={a}
        >
          {/* nested gold frames */}
          <rect x="7" y="7" width="286" height="386" strokeWidth="5" />
          <rect x="15" y="15" width="270" height="370" strokeWidth="1.4" />
          <rect
            x="27"
            y="27"
            width="246"
            height="346"
            strokeWidth="1"
            opacity="0.65"
          />
          {/* central medallion (şemse) */}
          <ellipse
            cx="150"
            cy="200"
            rx="64"
            ry="94"
            strokeWidth="2.4"
            fill="rgba(184,146,63,0.10)"
          />
          <ellipse cx="150" cy="200" rx="52" ry="80" strokeWidth="1" opacity="0.8" />
          {/* 8-point star inside the medallion */}
          <rect x="132" y="182" width="36" height="36" strokeWidth="1.5" />
          <rect
            x="132"
            y="182"
            width="36"
            height="36"
            strokeWidth="1.5"
            transform="rotate(45 150 200)"
          />
          <circle cx="150" cy="200" r="4" fill={a} stroke="none" />
          {/* pendants (salbek) above/below the medallion */}
          <ellipse cx="150" cy="92" rx="11" ry="17" strokeWidth="1.5" />
          <ellipse cx="150" cy="308" rx="11" ry="17" strokeWidth="1.5" />
          {/* corner pieces (köşebent) */}
          {corner(48, 48)}
          {corner(252, 48)}
          {corner(48, 352)}
          {corner(252, 352)}
        </svg>
      </>
    );
  }
  // ornate | classic | botanic → gilded double frame
  return (
    <>
      <div
        className="pointer-events-none absolute inset-3 rounded-sm"
        style={{
          border: `1.5px solid ${a}`,
          boxShadow: hasImage
            ? `inset 0 0 0 4px rgba(0,0,0,0.25)`
            : `inset 0 0 0 4px ${c.cover}, inset 0 0 0 5px ${a}`,
        }}
      />
      {s === "classic" &&
        [
          ["7%", "7%"],
          ["93%", "7%"],
          ["7%", "93%"],
          ["93%", "93%"],
        ].map(([x, y], i) => (
          <span
            key={i}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: x, top: y, color: a, fontSize: 13, opacity: 0.85 }}
          >
            ❦
          </span>
        ))}
    </>
  );
}

function coverOrnament(t: Theme): string | null {
  const s = t.style.coverStyle;
  if (s === "artdeco") return "◆ ◆ ◆";
  if (s === "midnight") return "✦ · ✦";
  if (s === "ornate" || s === "classic" || s === "botanic") return "✦ ⬩ ✦";
  return null;
}

/** Background-video embed url: autoplay, muted, looped, chromeless. */
function coverEmbedUrl(v: VideoMeta): string {
  if (v.provider === "vimeo") {
    return `https://player.vimeo.com/video/${v.videoId}?autoplay=1&muted=1&loop=1&background=1`;
  }
  return `https://www.youtube.com/embed/${v.videoId}?autoplay=1&mute=1&loop=1&playlist=${v.videoId}&controls=0&showinfo=0&modestbranding=1&playsinline=1&rel=0`;
}

/** Full-bleed cover background video — plays only while the cover is visible. */
function CoverVideo({ v, active }: { v: VideoMeta; active: boolean }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = true;
    if (active) el.play().catch(() => {});
    else el.pause();
  }, [active]);

  if (v.provider === "local") {
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video
        ref={ref}
        src={v.url}
        muted
        loop
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full object-cover"
      />
    );
  }
  // Don't run a background iframe when the cover isn't on screen.
  if (!active) return null;
  return (
    <iframe
      src={coverEmbedUrl(v)}
      title=""
      allow="autoplay; encrypted-media"
      className="pointer-events-none absolute left-1/2 top-1/2 h-[130%] w-[178%] -translate-x-1/2 -translate-y-1/2"
    />
  );
}

export default function BookFace({
  content,
  theme,
  side,
  active = true,
  editable,
  onImageMove,
  onImageResize,
  onTextMove,
  onTextResize,
  onCaptionMove,
  onVideoMove,
  onVideoResize,
  onLinkMove,
  onLinkResize,
  onCommit,
}: {
  content: FaceContent;
  theme: Theme;
  side: "left" | "right";
  active?: boolean;
} & Omit<EditProps, "containerRef">) {
  const c = theme.colors;
  const spineClass = side === "left" ? "spine-right" : "spine-left";
  const contentRef = useRef<HTMLDivElement | null>(null);
  const faceRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = faceRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / DESIGN_W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---- Front cover ----
  if (content.type === "cover") {
    const coverVideo = content.cover.video ?? null;
    const hasVideo = !!coverVideo;
    const hasImage = !hasVideo && !!content.cover.image;
    const hasMedia = hasVideo || hasImage;
    const ornament = coverOrnament(theme);
    return (
      <div
        className={`relative flex h-full w-full flex-col overflow-hidden ${spineClass} no-select`}
        style={
          {
            background: coverGradient(theme),
            color: c.coverText,
            "--spine": c.spine,
          } as React.CSSProperties
        }
      >
        {/* full-bleed cover video (autoplays muted, loops) */}
        {hasVideo && <CoverVideo v={coverVideo as VideoMeta} active={active} />}
        {/* full-bleed cover image */}
        {hasImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={content.cover.image as string}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        {hasMedia && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.35) 75%, rgba(0,0,0,0.72) 100%)",
            }}
          />
        )}

        {coverFrame(theme, hasMedia)}

        {/* masthead */}
        <div className="pointer-events-none relative z-10 flex h-full flex-col p-7">
          <div className="text-center">
            {ornament && (
              <div
                className="mb-3 text-xs tracking-[0.4em]"
                style={{
                  color: hasMedia ? "#fff" : c.coverAccent,
                  fontFamily: theme.fonts.mono,
                  opacity: 0.85,
                }}
              >
                {ornament}
              </div>
            )}
            {content.cover.title ? (
              <>
                <h1
                  className="font-bold uppercase leading-[0.95]"
                  style={{
                    fontFamily: theme.fonts.display,
                    fontSize: "clamp(1.9rem, 6vw, 3rem)",
                    letterSpacing: hasMedia ? "0.04em" : "0.02em",
                    textShadow: hasMedia
                      ? "0 2px 18px rgba(0,0,0,0.5)"
                      : "none",
                    color: hasMedia ? "#fff" : c.coverText,
                  }}
                >
                  {content.cover.title}
                </h1>
                <div
                  className="mx-auto mt-3 h-px w-14"
                  style={{ background: c.coverAccent, opacity: 0.9 }}
                />
              </>
            ) : null}
          </div>

          {content.cover.subtitle ? (
            <p
              className={`mt-auto text-center ${
                hasMedia ? "text-sm" : "text-base italic"
              }`}
              style={{
                fontFamily: hasMedia ? theme.fonts.mono : theme.fonts.body,
                textTransform: hasMedia ? "uppercase" : "none",
                letterSpacing: hasMedia ? "0.18em" : "normal",
                color: hasMedia ? "rgba(255,255,255,0.92)" : "inherit",
                opacity: hasMedia ? 1 : 0.9,
                textShadow: hasMedia ? "0 1px 10px rgba(0,0,0,0.6)" : "none",
              }}
            >
              {content.cover.subtitle}
            </p>
          ) : (
            <div className="mt-auto" />
          )}
        </div>
      </div>
    );
  }

  // ---- Back cover ----
  if (content.type === "back-cover") {
    return (
      <div
        className={`flex h-full w-full items-center justify-center ${spineClass} no-select`}
        style={
          {
            background: coverGradient(theme),
            color: c.coverText,
            "--spine": c.spine,
          } as React.CSSProperties
        }
      >
        <span
          className="text-xs uppercase tracking-[0.3em] opacity-70"
          style={{ fontFamily: theme.fonts.mono }}
        >
          son
        </span>
      </div>
    );
  }

  // ---- Blank inside cover / filler ----
  if (content.type === "blank") {
    return (
      <div
        className={`h-full w-full ${spineClass} ${
          theme.style.paperTexture ? "paper-texture" : ""
        }`}
        style={
          {
            background: c.paper,
            "--spine": c.spine,
          } as React.CSSProperties
        }
      />
    );
  }

  // ---- Content page ----
  const { page, pageNumber } = content;
  const hasCustomBg = !!(page.bgColor || page.bgImage);
  // In a spread, each face shows one half of the background; `side` decides
  // which half (handled on the <img> below).
  const spread = !!page.bgSpread;
  const isGradient = !!page.bgColor && page.bgColor.includes("gradient");
  return (
    <div
      ref={faceRef}
      className={`relative h-full w-full overflow-hidden ${spineClass} ${
        theme.style.paperTexture && !hasCustomBg ? "paper-texture" : ""
      } no-select`}
      style={
        {
          // Full-page background images are rendered as an <img> below (not a
          // CSS background) so PDF/canvas snapshots reproduce them at full
          // brightness. Only gradients/solid colours stay as CSS backgrounds.
          backgroundImage:
            !page.bgImage && isGradient ? (page.bgColor as string) : "none",
          backgroundColor: page.bgImage
            ? "#ffffff"
            : isGradient
            ? undefined
            : page.bgColor || c.paper,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          "--spine": c.spine,
        } as React.CSSProperties
      }
    >
      {page.bgImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={page.bgImage}
          alt=""
          aria-hidden
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full select-none"
          style={
            spread
              ? {
                  width: "200%",
                  height: "100%",
                  maxWidth: "none",
                  objectFit: "fill",
                  left: side === "left" ? "0" : "-100%",
                }
              : { objectFit: "contain" }
          }
        />
      )}

      {/* fixed-size design canvas, scaled to fit → identical everywhere */}
      <div
        className="absolute left-0 top-0"
        style={{
          width: DESIGN_W,
          height: DESIGN_H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <div className="flex h-full w-full flex-col px-7 py-7">
          <div className="relative flex-1 overflow-hidden" ref={contentRef}>
            <PageBody
              page={page}
              theme={theme}
              active={active}
              editable={editable}
              onImageMove={onImageMove}
              onImageResize={onImageResize}
              onTextMove={onTextMove}
              onTextResize={onTextResize}
              onCaptionMove={onCaptionMove}
              onVideoMove={onVideoMove}
              onVideoResize={onVideoResize}
              onLinkMove={onLinkMove}
              onLinkResize={onLinkResize}
              onCommit={onCommit}
              containerRef={contentRef}
            />
          </div>
        </div>

        {/* minimal page number, magazine-style (hidden on the closing page) */}
        {!content.isEnd && (
          <div
            className="absolute bottom-4 text-[11px] tracking-widest"
            style={{
              color: c.inkSoft,
              fontFamily: theme.fonts.mono,
              opacity: 0.7,
              ...(side === "left" ? { left: 28 } : { right: 28 }),
            }}
          >
            {pageNumber}
          </div>
        )}
      </div>
    </div>
  );
}
