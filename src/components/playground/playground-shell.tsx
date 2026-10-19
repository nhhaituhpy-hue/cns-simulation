"use client";

import React from "react";
import { useMemo, useState, useEffect } from "react";
import { PlaygroundErrorBoundary } from "./error-boundary";

interface Props {
  files: string[];
}

function stripExt(path: string) {
  return path.replace(/\.(tsx|ts)$/, "");
}

function groupByFolder(files: string[]) {
  const groups: Record<string, string[]> = {};
  for (const f of files) {
    const folder = f.includes("/") ? f.split("/")[0] : "(root)";
    if (!groups[folder]) groups[folder] = [];
    groups[folder].push(f);
  }
  return groups;
}

export function PlaygroundShell({ files }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<"preview" | "source">("preview");
  const [source, setSource] = useState<string>("");
  const [sourceLoading, setSourceLoading] = useState(false);
  const [Comp, setComp] = useState<React.ComponentType | null>(null);
  const [importError, setImportError] = useState<Error | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return files;
    return files.filter((f) => f.toLowerCase().includes(q));
  }, [files, query]);

  const groups = useMemo(() => groupByFolder(filtered), [filtered]);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setComp(null);
    setImportError(null);
    (async () => {
      try {
        const mod = (await import(`@/components/${stripExt(selected)}`)) as Record<string, unknown>;
        if (cancelled) return;
        let candidate: unknown = mod?.default;
        if (!candidate) {
          const keys = Object.keys(mod || {}).filter((k) => {
            const v = mod[k];
            return typeof v === "function" || (v && typeof v === "object" && "$$typeof" in (v as object));
          });
          candidate = keys.length ? mod[keys[0]] : null;
        }
        setComp(() => candidate as React.ComponentType | null);
      } catch (e) {
        if (!cancelled) setImportError(e instanceof Error ? e : new Error(String(e)));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  useEffect(() => {
    if (tab !== "source" || !selected) return;
    let cancelled = false;
    setSourceLoading(true);
    fetch(`/api/playground/source?path=${encodeURIComponent(selected)}`)
      .then((r) => r.text())
      .then((t) => {
        if (!cancelled) setSource(t);
      })
      .catch(() => {
        if (!cancelled) setSource("// failed to load source");
      })
      .finally(() => {
        if (!cancelled) setSourceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, selected]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--cns-surface-card)] text-white">
      {/* Sidebar */}
      <aside className="flex w-80 flex-col border-r border-white/10 bg-[var(--cns-surface-card)]">
        <div className="border-b border-white/10 p-3">
          <h1 className="text-sm font-bold uppercase tracking-wider text-cyan-100">Playground</h1>
          <p className="mt-1 text-xs text-slate-400">{files.length} components</p>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm component..."
            className="mt-2 w-full rounded-md border border-white/10 bg-[var(--cns-surface-card)] px-2 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-300"
          />
        </div>
        <div className="flex-1 overflow-auto p-2 text-sm">
          {Object.entries(groups).map(([folder, list]) => (
            <div key={folder} className="mb-3">
              <div className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                {folder} ({list.length})
              </div>
              {list.map((f) => (
                <button
                  key={f}
                  onClick={() => setSelected(f)}
                  className={`block w-full truncate rounded px-2 py-1 text-left text-xs ${
                    selected === f
                      ? "bg-cyan-500/20 text-cyan-100"
                      : "text-slate-300 hover:bg-white/5"
                  }`}
                  title={f}
                >
                  {f.split("/").pop()}
                </button>
              ))}
            </div>
          ))}
        </div>
      </aside>

      {/* Main */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-2">
          <div className="truncate text-sm font-medium text-slate-200">{selected ?? "—"}</div>
          <div className="flex gap-1">
            <button
              onClick={() => setTab("preview")}
              className={`rounded px-3 py-1 text-xs font-semibold ${
                tab === "preview" ? "bg-cyan-500/30 text-cyan-100" : "text-slate-400 hover:text-white"
              }`}
            >
              Preview
            </button>
            <button
              onClick={() => setTab("source")}
              className={`rounded px-3 py-1 text-xs font-semibold ${
                tab === "source" ? "bg-cyan-500/30 text-cyan-100" : "text-slate-400 hover:text-white"
              }`}
            >
              Source
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4">
          {tab === "preview" && (
            <div className="rounded-lg border border-white/10 bg-[var(--cns-surface-card)]/60 p-4">
              {!selected && <p className="text-sm text-slate-400">Chọn một component từ sidebar để xem trước.</p>}
              {selected && importError && (
                <div className="text-sm text-red-300">
                  <p className="font-semibold">Import error</p>
                  <pre className="mt-2 whitespace-pre-wrap text-xs">{importError.message}</pre>
                </div>
              )}
              {selected && !importError && !Comp && (
                <p className="text-sm text-slate-400">Đang tải component… (hoặc component không có export hợp lệ)</p>
              )}
              {selected && !importError && Comp && (
                <PlaygroundErrorBoundary
                  fallback={(err) => (
                    <div className="text-sm text-amber-300">
                      <p className="font-semibold">Render error</p>
                      <pre className="mt-2 whitespace-pre-wrap text-xs">{err.message}</pre>
                    </div>
                  )}
                >
                  <Comp />
                </PlaygroundErrorBoundary>
              )}

            </div>
          )}

          {tab === "source" && (
            <div className="rounded-lg border border-white/10 bg-[var(--cns-surface-card)]/60 p-4">
              {sourceLoading && <p className="text-sm text-slate-400">Đang tải source…</p>}
              {!sourceLoading && (
                <pre className="whitespace-pre-wrap break-words font-mono text-xs text-slate-200">{source}</pre>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}