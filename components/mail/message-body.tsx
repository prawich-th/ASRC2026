"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./mail.module.scss";

/**
 * Received HTML is untrusted. It renders in a sandboxed iframe without
 * `allow-scripts`, behind a CSP that blocks scripts. Remote images stay
 * blocked (they can track opens) until the reader asks for them.
 * `allow-same-origin` only lets this page measure the content height;
 * scripts can't run inside the frame either way.
 */
function buildDocument(html: string, loadImages: boolean): string {
  const imageSources = loadImages ? "https: data: cid:" : "data: cid:";
  const csp = `default-src 'none'; img-src ${imageSources}; style-src 'unsafe-inline'; font-src https: data:`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><base target="_blank"><style>body{margin:0;font:14px/1.6 Inter,Arial,sans-serif;color:#171717;overflow-wrap:anywhere}img{max-width:100%;height:auto}</style></head><body>${html}</body></html>`;
}

export default function MessageBody({
  html,
  text,
}: {
  html: string | null;
  text: string | null;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(120);
  const [loadImages, setLoadImages] = useState(false);
  const [showText, setShowText] = useState(!html);
  const hasRemoteImages = Boolean(html && /<img[^>]+src=["']?https?:/i.test(html));

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || showText) {
      return;
    }
    let observer: ResizeObserver | undefined;
    const measure = () => {
      const body = frame.contentDocument?.body;
      if (!body) {
        return;
      }
      setHeight(Math.min(Math.max(body.scrollHeight + 8, 60), 4000));
      observer?.disconnect();
      observer = new ResizeObserver(() =>
        setHeight(Math.min(Math.max(body.scrollHeight + 8, 60), 4000)),
      );
      observer.observe(body);
    };
    frame.addEventListener("load", measure);
    if (frame.contentDocument?.readyState === "complete") {
      measure();
    }
    return () => {
      frame.removeEventListener("load", measure);
      observer?.disconnect();
    };
  }, [showText, loadImages, html]);

  return (
    <div className={styles.body}>
      {html && (text || hasRemoteImages) ? (
        <div className={styles.bodyTools}>
          {text ? (
            <button type="button" onClick={() => setShowText((value) => !value)}>
              {showText ? "Show formatted" : "Show plain text"}
            </button>
          ) : null}
          {!showText && hasRemoteImages && !loadImages ? (
            <button type="button" onClick={() => setLoadImages(true)}>
              Load images
            </button>
          ) : null}
        </div>
      ) : null}
      {showText || !html ? (
        <div className={styles.plainText}>{text || "(no content)"}</div>
      ) : (
        <iframe
          ref={frameRef}
          className={styles.frame}
          title="Email content"
          sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          srcDoc={buildDocument(html, loadImages)}
          style={{ height }}
        />
      )}
    </div>
  );
}
