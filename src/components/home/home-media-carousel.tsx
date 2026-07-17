"use client";

import { CaretLeft, CaretRight, SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type HomeMediaCarouselProps = {
  baseUrl: string;
};

const mediaItems = [
  { id: "examiner-vor", kind: "video", label: "Hướng dẫn Giám khảo VOR", file: "huong-dan-giam-khao-vor", voiceFile: "huong-dan-giam-khao-vor-dme.mp3" },
  { id: "examiner-ads-b", kind: "video", label: "Hướng dẫn Giám khảo ADS-B", file: "huong-dan-giam-khao-ads-b", voiceFile: "huong-dan-giam-khao-adsb.mp3" },
  { id: "candidate-vor", kind: "video", label: "Hướng dẫn Thí sinh VOR", file: "huong-dan-thi-sinh-vor" },
  { id: "candidate-ads-b", kind: "video", label: "Hướng dẫn Thí sinh ADS-B", file: "huong-dan-thi-sinh-ads-b" },
] as const;

function joinAssetUrl(baseUrl: string, fileName: string) {
  return `${baseUrl.replace(/\/$/, "")}/${fileName}`;
}

export function HomeMediaCarousel({ baseUrl }: HomeMediaCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isVoiceOverEnabled, setIsVoiceOverEnabled] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const items = useMemo(
    () => mediaItems.map((item) => ({
      ...item,
      videoUrl: joinAssetUrl(baseUrl, `${item.file}.mp4`),
      posterUrl: joinAssetUrl(baseUrl, `${item.file}.webp`),
      voiceUrl: "voiceFile" in item && item.voiceFile ? joinAssetUrl(baseUrl, item.voiceFile) : undefined,
    })),
    [baseUrl],
  );
  const activeItem = items[activeIndex];

  const showPrevious = useCallback(() => {
    setActiveIndex((current) => (current - 1 + items.length) % items.length);
  }, [items.length]);

  const showNext = useCallback(() => {
    setActiveIndex((current) => (current + 1) % items.length);
  }, [items.length]);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      void Promise.allSettled(
        items.flatMap((item) => [
          item.posterUrl,
          item.videoUrl,
          ...(item.voiceUrl ? [item.voiceUrl] : []),
        ]).map(async (url) => {
          const response = await fetch(url, {
            cache: "force-cache",
            mode: "cors",
            signal: controller.signal,
          });
          if (response.ok) await response.arrayBuffer();
        }),
      );
    }, 1200);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [items]);

  useEffect(() => {
    if (videoRef.current) {
      // Tắt tiếng video gốc khi có lồng tiếng
      videoRef.current.muted = isVoiceOverEnabled && !!activeItem.voiceUrl;
      if (!isVoiceOverEnabled) {
        audioRef.current?.pause();
      } else if (isVoiceOverEnabled && !videoRef.current.paused && audioRef.current) {
        audioRef.current.currentTime = videoRef.current.currentTime;
        audioRef.current.play().catch((err) => console.log("Audio play blocked", err));
      }
    }
  }, [isVoiceOverEnabled, activeItem]);

  const handlePlay = () => {
    if (isVoiceOverEnabled && audioRef.current) {
      audioRef.current.play().catch((err) => console.log("Audio play blocked", err));
    }
  };

  const handlePause = () => {
    audioRef.current?.pause();
  };

  const handleSeeking = () => {
    if (audioRef.current && videoRef.current) {
      audioRef.current.currentTime = videoRef.current.currentTime;
    }
  };

  const handleSeeked = () => {
    if (audioRef.current && videoRef.current) {
      audioRef.current.currentTime = videoRef.current.currentTime;
      if (isVoiceOverEnabled && !videoRef.current.paused) {
        audioRef.current.play().catch((err) => console.log("Audio play blocked", err));
      }
    }
  };

  const handleRateChange = () => {
    if (audioRef.current && videoRef.current) {
      audioRef.current.playbackRate = videoRef.current.playbackRate;
    }
  };

  return (
    <div
      className="relative h-full min-h-0 overflow-hidden rounded-xl bg-[#07111b]"
      data-cache-strategy="supabase-immutable"
    >
      <video
        key={activeItem.id}
        ref={videoRef}
        aria-label={activeItem.label}
        className="h-full w-full object-contain"
        poster={activeItem.posterUrl}
        playsInline
        controls
        preload="metadata"
        onPlay={handlePlay}
        onPause={handlePause}
        onSeeking={handleSeeking}
        onSeeked={handleSeeked}
        onRateChange={handleRateChange}
      >
        <source src={activeItem.videoUrl} type="video/mp4" />
        Trình duyệt không hỗ trợ phát video MP4.
      </video>

      {activeItem.voiceUrl && isVoiceOverEnabled && (
        <audio
          key={`${activeItem.id}-voice`}
          ref={audioRef}
          src={activeItem.voiceUrl}
          preload="auto"
        />
      )}

      {activeItem.voiceUrl && (
        <button
          type="button"
          onClick={() => setIsVoiceOverEnabled(!isVoiceOverEnabled)}
          className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-lg border border-white/20 bg-[#07111b]/80 px-2.5 py-1.5 text-[11px] font-medium text-white shadow-lg backdrop-blur-sm transition-all hover:bg-[#07111b]/95 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {isVoiceOverEnabled ? (
            <>
              <SpeakerHigh size={14} weight="bold" />
              <span>Lồng tiếng Việt: Bật</span>
            </>
          ) : (
            <>
              <SpeakerSlash size={14} weight="bold" />
              <span>Lồng tiếng Việt: Tắt</span>
            </>
          )}
        </button>
      )}

      <button
        type="button"
        aria-label="Xem clip trước"
        onClick={showPrevious}
        className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-white/35 bg-[#07111b]/70 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-[#07111b]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <CaretLeft aria-hidden size={20} weight="bold" />
      </button>
      <button
        type="button"
        aria-label="Xem clip tiếp theo"
        onClick={showNext}
        className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-white/35 bg-[#07111b]/70 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-[#07111b]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <CaretRight aria-hidden size={20} weight="bold" />
      </button>

      <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
        <span className="rounded-full border border-white/25 bg-[#07111b]/65 px-2.5 py-1 font-mono text-[11px] font-semibold tabular-nums text-white backdrop-blur-sm">
          {activeIndex + 1}/{items.length}
        </span>
      </div>
      <div className="absolute inset-x-0 bottom-12 flex justify-center gap-1.5" aria-label="Chọn clip hướng dẫn">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            aria-label={`Mở ${item.label}`}
            aria-current={index === activeIndex ? "true" : undefined}
            onClick={() => setActiveIndex(index)}
            className={`h-2 rounded-full border border-white/50 transition-[width,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
              index === activeIndex ? "w-7 bg-white" : "w-2 bg-white/35 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
