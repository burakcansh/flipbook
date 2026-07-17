"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BookCover, BookPage } from "@/lib/types";
import type { Theme } from "@/lib/themes";
import BookFace, { type FaceContent } from "./BookFace";
import { isPageEmpty } from "@/lib/textBlocks";
import { playFlipSound } from "@/lib/sound";

interface Leaf {
  front: FaceContent;
  back: FaceContent;
}

/**
 * Builds the physical "leaves" of the book.
 * - Leaf 0: front = cover, back = page 1 (the first content page, ALONE).
 * - Every leaf after that carries two pages: front + back.
 * This guarantees no page is skipped (the classic "page 2 missing" bug).
 */
function buildLeaves(cover: BookCover, pages: BookPage[]): Leaf[] {
  // The very last face is either the editable closing page or the default "SON".
  const hasEnd = !!cover.endPage && !isPageEmpty(cover.endPage);
  const endFace: FaceContent = hasEnd
    ? {
        type: "page",
        page: cover.endPage as BookPage,
        pageNumber: pages.length + 1,
        isEnd: true,
      }
    : { type: "back-cover" };

  const leaves: Leaf[] = [];
  leaves.push({
    front: { type: "cover", cover },
    back: pages[0] ? { type: "page", page: pages[0], pageNumber: 1 } : endFace,
  });
  let endPlaced = !pages[0];

  let i = 1;
  while (i < pages.length) {
    const front: FaceContent = {
      type: "page",
      page: pages[i],
      pageNumber: i + 1,
    };
    const backPage = pages[i + 1];
    let back: FaceContent;
    if (backPage) {
      back = { type: "page", page: backPage, pageNumber: i + 2 };
    } else {
      back = endFace;
      endPlaced = true;
    }
    leaves.push({ front, back });
    i += 2;
  }
  // Odd page count → the closing face still needs its own leaf.
  if (!endPlaced) {
    leaves.push({ front: { type: "blank" }, back: endFace });
  }
  return leaves;
}

type Drag = {
  index: number; // -1 until a direction is locked
  dir: "forward" | "back" | null;
  startX: number;
  progress: number; // 0..1
  moved: boolean;
};

export default function Flipbook({
  cover,
  pages,
  theme,
}: {
  cover: BookCover;
  pages: BookPage[];
  theme: Theme;
}) {
  const leaves = useMemo(() => buildLeaves(cover, pages), [cover, pages]);
  const total = leaves.length;

  // current = number of leaves flipped to the left (0 = closed cover).
  const [current, setCurrent] = useState(0);
  const [flipping, setFlipping] = useState<number | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  // On mobile we show a single page at a time. `half` = which page of the open
  // spread is centered: 0 = left page, 1 = right page.
  const [half, setHalf] = useState(0);
  // Reader zoom (1 = fit) with drag-to-pan while zoomed in.
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const soundRef = useRef(true);

  const currentRef = useRef(0);
  const halfRef = useRef(0);
  const mobileRef = useRef(false);
  const zoomRef = useRef(1);
  const panStart = useRef<{ x: number; y: number; px: number; py: number } | null>(
    null
  );
  useEffect(() => {
    currentRef.current = current;
  }, [current]);
  useEffect(() => {
    halfRef.current = half;
  }, [half]);
  useEffect(() => {
    mobileRef.current = isMobile;
  }, [isMobile]);
  useEffect(() => {
    zoomRef.current = zoom;
    if (zoom === 1) setPan({ x: 0, y: 0 });
  }, [zoom]);
  // Recentre when the page changes.
  useEffect(() => {
    setPan({ x: 0, y: 0 });
  }, [current, half]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // load sound preference
  useEffect(() => {
    const saved = window.localStorage.getItem("flipbook.sound");
    const on = saved !== "off";
    setSoundOn(on);
    soundRef.current = on;
  }, []);

  const toggleSound = () => {
    setSoundOn((on) => {
      const next = !on;
      soundRef.current = next;
      window.localStorage.setItem("flipbook.sound", next ? "on" : "off");
      if (next) playFlipSound(); // little preview when enabling
      return next;
    });
  };

  // Keep state valid if the book shrinks.
  useEffect(() => {
    if (current > total) setCurrent(total);
  }, [total, current]);

  const flipForward = useCallback(() => {
    const c = currentRef.current;
    if (c >= total) return;
    setFlipping(c);
    if (soundRef.current) playFlipSound();
    setHalf(0);
    setCurrent(c + 1);
  }, [total]);

  const flipBack = useCallback(() => {
    const c = currentRef.current;
    if (c <= 0) return;
    setFlipping(c - 1);
    if (soundRef.current) playFlipSound();
    // Landing on an open spread → focus its right page; on the cover → half 0.
    setHalf(c - 1 >= 1 ? 1 : 0);
    setCurrent(c - 1);
  }, []);

  const next = useCallback(() => {
    if (mobileRef.current) {
      const c = currentRef.current;
      // Open spread showing the left page → slide to the right page first.
      if (c >= 1 && c < total && halfRef.current === 0) {
        setHalf(1);
        if (soundRef.current) playFlipSound();
        return;
      }
      flipForward();
      return;
    }
    flipForward();
  }, [flipForward, total]);

  const prev = useCallback(() => {
    if (mobileRef.current) {
      const c = currentRef.current;
      // Open spread showing the right page → slide back to the left page.
      if (c >= 1 && c <= total - 1 && halfRef.current === 1) {
        setHalf(0);
        if (soundRef.current) playFlipSound();
        return;
      }
      flipBack();
      return;
    }
    flipBack();
  }, [flipBack, total]);

  // Keyboard navigation.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  const pageWidth = () => {
    const w = sceneRef.current?.getBoundingClientRect().width ?? 600;
    return w / 2;
  };

  // ---- zoom + pan (reader can enlarge a page and drag to move around) ----
  const clampPan = (x: number, y: number, z: number) => {
    const el = sceneRef.current;
    if (!el) return { x, y };
    // On mobile the scene holds two page-halves; confine panning to the single
    // page the reader is zoomed into so it never drifts onto the neighbour.
    const panWidth = mobileRef.current ? el.offsetWidth / 2 : el.offsetWidth;
    const maxX = (panWidth * (z - 1)) / 2;
    const maxY = (el.offsetHeight * (z - 1)) / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  };
  const changeZoom = (z: number) =>
    setZoom(Math.max(1, Math.min(3, Math.round(z * 20) / 20)));
  const onZoomPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoomRef.current <= 1) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    setPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
  };
  const onZoomPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!panStart.current) return;
    const nx = panStart.current.px + (e.clientX - panStart.current.x);
    const ny = panStart.current.py + (e.clientY - panStart.current.y);
    setPan(clampPan(nx, ny, zoomRef.current));
  };
  const onZoomPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!panStart.current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    panStart.current = null;
    setPanning(false);
  };

  // ---- pointer drag (mouse + touch): direction-based page turn ----
  // Grab anywhere and swipe: left → next page, right → previous page.
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoomRef.current > 1) return; // zoomed → wrapper handles panning
    if (drag) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    setDrag({ index: -1, dir: null, startX: e.clientX, progress: 0, moved: false });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoomRef.current > 1) return;
    // Mobile: no real-time leaf follow (single-page mode) — just track movement.
    if (mobileRef.current) {
      setDrag((d) =>
        d ? { ...d, moved: d.moved || Math.abs(e.clientX - d.startX) > 5 } : d
      );
      return;
    }
    setDrag((d) => {
      if (!d) return d;
      const dx = e.clientX - d.startX;
      const moved = d.moved || Math.abs(dx) > 5;
      let { dir, index } = d;

      // Lock direction from the swipe once it's clear.
      if (dir === null) {
        if (Math.abs(dx) < 6) return { ...d, moved };
        if (dx < 0) {
          if (current >= total) return { ...d, moved }; // no next page
          dir = "forward";
          index = current;
        } else {
          if (current <= 0) return { ...d, moved }; // no prev page
          dir = "back";
          index = current - 1;
        }
      }

      const dist = dir === "forward" ? d.startX - e.clientX : e.clientX - d.startX;
      const progress = Math.max(0, Math.min(1, dist / pageWidth()));
      return { ...d, dir, index, progress, moved };
    });
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoomRef.current > 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    setDrag((d) => {
      if (!d) return null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (mobileRef.current) {
        const dx = e.clientX - d.startX;
        if (Math.abs(dx) > 40) {
          if (dx < 0) next();
          else prev();
        } else if (!d.moved) {
          if (clickX < rect.width / 2) prev();
          else next();
        }
        return null;
      }
      if (d.dir === null) {
        // no swipe → treat as a click on the left/right half
        if (!d.moved) {
          if (clickX < rect.width / 2) prev();
          else next();
        }
      } else if (d.progress > 0.35) {
        // committed the turn
        if (d.dir === "forward") next();
        else prev();
      }
      // otherwise: released early → leaf springs back
      return null;
    });
  };

  // Wheel / trackpad scrolling turns pages ONLY while the cursor is over the
  // book. One physical scroll gesture = exactly one page (momentum events are
  // ignored until the wheel goes quiet). preventDefault keeps the page from
  // scrolling so the layout stays put; outside the book the wheel is untouched.
  const wheelArmed = useRef(true);
  const wheelIdle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFlip = useRef(0);
  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (zoomRef.current > 1) return; // zoomed → let the page scroll/pan freely
      const amount =
        Math.abs(e.deltaX) >= Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(amount) < 6) return;
      e.preventDefault(); // don't scroll the page — keep the layout in place

      // Re-arm only after the wheel has been quiet for a while (past momentum).
      if (wheelIdle.current) clearTimeout(wheelIdle.current);
      wheelIdle.current = setTimeout(() => {
        wheelArmed.current = true;
      }, 260);

      const now = Date.now();
      // Must be armed AND at least 550ms since the last turn → 1 flip/gesture.
      if (!wheelArmed.current || now - lastFlip.current < 550) return;
      wheelArmed.current = false;
      lastFlip.current = now;
      if (amount > 0) next();
      else prev();
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [next, prev]);

  const zFor = (i: number): number => {
    if (drag && drag.dir !== null && drag.index === i) return total + 60;
    if (flipping === i) return total + 50; // animating leaf rides on top
    if (i < current) return i + 1; // flipped → left stack (newest on top)
    return total - i; // unflipped → right stack (next-to-flip on top)
  };

  // Inline transform for the leaf currently under the finger/mouse.
  const dragStyle = (i: number): React.CSSProperties | undefined => {
    if (!drag || drag.dir === null || drag.index !== i) return undefined;
    const deg =
      drag.dir === "forward"
        ? -180 * drag.progress
        : -180 * (1 - drag.progress);
    const sheen = Math.sin(drag.progress * Math.PI) * 0.55;
    return {
      transform: `rotateY(${deg}deg)`,
      transition: "none",
      ["--sheen" as string]: String(sheen),
    } as React.CSSProperties;
  };

  // Slide the book. Desktop shows the spread centered; mobile focuses a single
  // page (filling the screen) with the neighbouring page peeking at the edge.
  let offset: string;
  if (isMobile) {
    // A single leaf face is half the spread; ±25% of the book width centres it
    // in the viewport regardless of screen size. Right-hand faces (cover, the
    // right page) shift left; left-hand faces (left page, back cover) shift right.
    if (current === 0)
      offset = "-25%"; // cover (right half)
    else if (current >= total)
      offset = "25%"; // back cover / closing page (left half)
    else offset = half === 0 ? "25%" : "-25%"; // left page vs right page focus
  } else {
    offset = current === 0 ? "-25%" : current >= total ? "25%" : "0%";
  }

  // With the focused page centred, the zoom anchor is simply the viewport centre.
  const zoomOriginX = 50;

  return (
    <div
      className={`flex w-full flex-col items-center gap-4 ${
        isMobile
          ? "min-h-[calc(100dvh-64px)] justify-center overflow-x-hidden"
          : ""
      }`}
    >
      <div
        className="relative"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: `${zoomOriginX}% center`,
          transition: panning ? "none" : "transform 0.2s ease",
          cursor: zoom > 1 ? (panning ? "grabbing" : "grab") : undefined,
          touchAction: zoom > 1 ? "none" : undefined,
        }}
        onPointerDown={onZoomPointerDown}
        onPointerMove={onZoomPointerMove}
        onPointerUp={onZoomPointerUp}
        onPointerCancel={onZoomPointerUp}
      >
        <div
          ref={sceneRef}
          className="flip-scene relative mx-auto no-select"
          style={
            {
            // Mobile: one page ≈ full screen width (book spread ≈ 2× screen),
            // so a single page fills and the neighbour peeks. Desktop: fit spread.
            width: isMobile
              ? "min(182vw, calc((100dvh - 150px) * 1.5))"
              : "min(96vw, calc((100vh - 240px) * 1.5))",
            aspectRatio: "3 / 2",
            touchAction: "pan-y",
            // premium mirror reflection under the book — desktop only
            WebkitBoxReflect: isMobile
              ? undefined
              : "below 12px linear-gradient(transparent 52%, rgba(0,0,0,0.32) 100%)",
            marginBottom: isMobile ? "16px" : "clamp(40px, 10vh, 130px)",
          } as React.CSSProperties
        }
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {!isMobile && <div className="book-base-shadow" />}
        <div
          className="flip-book relative mx-auto h-full"
          style={{
            width: "100%",
            transform: `translateX(${offset})`,
            transition: "transform 0.6s ease",
          }}
        >
          {leaves.map((leaf, i) => {
            const dragged = !!drag && drag.dir !== null && drag.index === i;
            const frontActive = i === current || flipping === i || dragged;
            const backActive = i === current - 1 || flipping === i || dragged;
            return (
              <div
                key={i}
                className={`flip-leaf ${i < current ? "flipped" : ""} ${
                  flipping === i ? "is-flipping" : ""
                }`}
                style={{ zIndex: zFor(i), ...dragStyle(i) }}
                onTransitionEnd={() =>
                  setFlipping((f) => (f === i ? null : f))
                }
              >
                <div className="flip-face front">
                  <BookFace
                    content={leaf.front}
                    theme={theme}
                    side="right"
                    active={frontActive}
                  />
                  <div className="page-sheen" />
                </div>
                <div className="flip-face back">
                  <BookFace
                    content={leaf.back}
                    theme={theme}
                    side="left"
                    active={backActive}
                  />
                  <div className="page-sheen" />
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </div>

      {/* zoom control (top, horizontal slider) */}
      <div className="fixed left-1/2 top-16 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-white/85 shadow-lg backdrop-blur sm:top-3">
        <button
          onClick={() => changeZoom(zoom - 0.25)}
          disabled={zoom <= 1}
          aria-label="Uzaklaştır"
          className="flex h-6 w-6 items-center justify-center rounded-full text-lg leading-none hover:bg-white/10 disabled:opacity-30"
        >
          −
        </button>
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          aria-label="Yakınlaştırma"
          className="h-1 w-24 cursor-pointer accent-amber-400 sm:w-40"
        />
        <button
          onClick={() => changeZoom(zoom + 0.25)}
          disabled={zoom >= 3}
          aria-label="Yakınlaştır"
          className="flex h-6 w-6 items-center justify-center rounded-full text-lg leading-none hover:bg-white/10 disabled:opacity-30"
        >
          ＋
        </button>
        <span className="w-9 text-center text-[11px] tabular-nums text-white/70">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* large vector arrows on the sides of the book */}
      <button
        onClick={prev}
        disabled={current === 0}
        aria-label="Önceki sayfa"
        className="fixed left-3 top-1/2 z-40 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white/85 backdrop-blur transition hover:bg-black/55 disabled:pointer-events-none disabled:opacity-0 sm:left-6 sm:h-14 sm:w-14"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <button
        onClick={next}
        disabled={current >= total}
        aria-label="Sonraki sayfa"
        className="fixed right-3 top-1/2 z-40 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white/85 backdrop-blur transition hover:bg-black/55 disabled:pointer-events-none disabled:opacity-0 sm:right-6 sm:h-14 sm:w-14"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>

      {/* minimal page indicator + sound toggle */}
      <div className="flex items-center gap-3 text-xs text-white/55">
        <span className="tabular-nums">
          {(() => {
            const totalPages = pages.length;
            if (current === 0) return "Kapak";
            const leftIdx = 2 * (current - 1); // 0-based left page of spread
            const rightIdx = leftIdx + 1;
            if (leftIdx >= totalPages)
              return cover.endPage && !isPageEmpty(cover.endPage)
                ? "Bitiş"
                : "Arka kapak"; // closing page / back cover
            if (isMobile) {
              const idx = half === 1 ? rightIdx : leftIdx;
              const no = Math.min(idx, totalPages - 1) + 1;
              return `Sayfa ${no} / ${totalPages}`;
            }
            return rightIdx < totalPages
              ? `Sayfa ${leftIdx + 1}–${rightIdx + 1} / ${totalPages}`
              : `Sayfa ${leftIdx + 1} / ${totalPages}`;
          })()}
        </span>
        <button
          onClick={toggleSound}
          title={soundOn ? "Sesi kapat" : "Sesi aç"}
          aria-label={soundOn ? "Sesi kapat" : "Sesi aç"}
          className="rounded-full border border-white/20 px-2 py-0.5 text-sm leading-none hover:bg-white/10"
        >
          {soundOn ? "🔊" : "🔇"}
        </button>
      </div>
    </div>
  );
}
