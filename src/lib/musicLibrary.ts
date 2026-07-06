import type { MusicTrack } from "./types";

/** Ready-made background tracks, served statically from /public/audio. */
export const MUSIC_LIBRARY: MusicTrack[] = [
  { id: "lib_hotel1", title: "Hotel Music — Calm 1", url: "/audio/hotel-calm-1.mp3" },
  { id: "lib_hotel2", title: "Hotel Music — Calm 2", url: "/audio/hotel-calm-2.mp3" },
  { id: "lib_hotel3", title: "Hotel Music — Calm 3", url: "/audio/hotel-calm-3.mp3" },
  { id: "lib_serenity", title: "Serenity Flow", url: "/audio/serenity-flow.mp3" },
];
