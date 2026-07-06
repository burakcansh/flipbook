"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BookCover, BookPage } from "@/lib/types";
import type { Theme } from "@/lib/themes";
import BookFace, { type FaceContent } from "./BookFace";
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
  const leaves: Leaf[] = [];
  leaves.push({
    front: { type: "cover", cover },
    back: pages[0]
      ? { type: "page", page: pages[0], pageNumber: 1 }
      : { type: "blank" },
  });

  let i = 1;
  while (i < pages.length) {
    const front: FaceContent = {
      type: "page",
      page: pages[i],
      pageNumber: i + 1,
    };
    const backPage = pages[i + 1];
    const back: FaceContent = backPage
      ? { type: "page", page: backPage, pageNumber: i + 2 }
      : { type: "back-cover" };
    leaves.push({ front, back });
    i += 2;
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
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const soundRef = useRef(true);

  const currentRef = useRef(0);
  const halfRef = useRef(0);
  const mobileRef = useRef(false);
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

  // ---- pointer drag (mouse + touch): direction-based page turn ----
  // Grab anywhere and swipe: left → next page, right → previous page.
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drag) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    setDrag({ index: -1, dir: null, startX: e.clientX, progress: 0, moved: false });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
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
    if (current === 0)
      offset = "-45%"; // cover (right half) centered
    else if (current >= total)
      offset = "2%"; // back cover / last left page
    else offset = half === 0 ? "2%" : "-44%"; // left page vs right page focus
  } else {
    offset = current === 0 ? "-25%" : current >= total ? "25%" : "0%";
  }

  return (
    <div
      className={`flex w-full flex-col items-center gap-4 ${
        isMobile ? "overflow-x-hidden" : ""
      }`}
    >
      <div
        ref={sceneRef}
        className="flip-scene relative mx-auto no-select"
        style={
          {
            // Mobile: one page ≈ full screen width (book spread ≈ 2× screen),
            // so a single page fills and the neighbour peeks. Desktop: fit spread.
            width: isMobile
              ? "min(172vw, calc((100vh - 120px) * 1.5))"
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
          {current === 0
            ? "Kapak"
            : current >= total
            ? "Arka kapak"
            : `${current} / ${total - 1}`}
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
