"use client";

import { Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Reads a receipt QR with the device camera (a laptop webcam or a phone) — for staff without a
 * hardware scanner, and as a backup when one is unplugged. The library is loaded only when this
 * opens. Browsers only allow camera access on https:// pages or on localhost.
 * Calls `onResult` once with the raw QR text, then the parent closes it.
 */
export function CameraScanner({ onResult, onClose }: { onResult: (text: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<"starting" | "scanning" | "error">("starting");
  const [message, setMessage] = useState("");
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    let scanner: { start: () => Promise<void>; stop: () => void; destroy: () => void } | null = null;
    let cancelled = false;
    (async () => {
      try {
        const { default: QrScanner } = await import("qr-scanner");
        if (cancelled || !videoRef.current) return;
        if (!(await QrScanner.hasCamera())) {
          setState("error");
          setMessage("No camera was found on this device.");
          return;
        }
        scanner = new QrScanner(
          videoRef.current,
          (result: { data: string }) => {
            scanner?.stop();
            onResultRef.current(result.data);
          },
          { preferredCamera: "environment", highlightScanRegion: true, highlightCodeOutline: true, maxScansPerSecond: 12, returnDetailedScanResult: true },
        );
        await scanner.start();
        if (!cancelled) setState("scanning");
      } catch (error) {
        if (cancelled) return;
        setState("error");
        const text = error instanceof Error ? error.message : String(error);
        setMessage(/permission|denied|notallowed/i.test(text) ? "Camera access was blocked. Allow the camera for this site in the browser's address bar, then try again." : "The camera couldn't be started.");
      }
    })();
    return () => {
      cancelled = true;
      scanner?.destroy();
    };
  }, []);

  return (
    <div className="relative aspect-square w-full max-w-xs overflow-hidden rounded-2xl bg-black">
      <video ref={videoRef} className="size-full object-cover" playsInline muted />
      {state === "starting" ? (
        <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-white">
          <Loader2 className="size-4 animate-spin" /> Starting camera…
        </div>
      ) : null}
      {state === "error" ? <p className="absolute inset-0 flex items-center justify-center p-5 text-center text-sm text-white">{message}</p> : null}
      <Button type="button" size="icon" variant="secondary" className="absolute top-2 right-2 size-8 rounded-full" onClick={onClose} aria-label="Close camera">
        <X className="size-4" />
      </Button>
      {state === "scanning" ? <p className="absolute inset-x-0 bottom-2 text-center text-xs text-white/90 drop-shadow">Hold the parent&apos;s QR code in the frame</p> : null}
    </div>
  );
}
