"use client";

import { useEffect } from "react";

/**
 * Tables don't fit a phone. CSS (globals.css, "stacked tables") turns every table into a stack of cards
 * below 768px — one card per row, each cell showing its column name beside its value. CSS can't read the
 * header text, so this copies each column's header onto its cells (as data-label), now and whenever rows
 * change. Mount once in a layout; it costs nothing on desktop.
 */
export function StackedTables() {
  useEffect(() => {
    let frame = 0;
    function label() {
      document.querySelectorAll<HTMLTableElement>("table[data-stack]").forEach((table) => {
        const headers = Array.from(table.querySelectorAll("thead th")).map((th) => (th.textContent ?? "").trim());
        if (headers.length === 0) return;
        table.querySelectorAll("tbody tr").forEach((row) => {
          Array.from(row.children).forEach((cell, index) => {
            const td = cell as HTMLElement;
            const spans = Number(td.getAttribute("colspan") ?? 1) > 1;
            const text = spans ? "" : (headers[index] ?? "");
            if (td.dataset.label !== text) td.dataset.label = text;
          });
        });
      });
    }
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(label);
    };
    label();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
