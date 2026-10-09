import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { Badge, ControlButton, EmptyState, ErrorState, Field, Input, PageHeader, Spinner } from "@xsec/ui-react";
import { ChevronDown, ChevronRight, File, Folder, RefreshCw } from "lucide-react";
import { confirmed, errorMessage, parseContent, parseFiles, request, type Owner, type PluginHost, type ProjectFile } from "./host";
import { FilePreview, fileSize, type Preview } from "./preview";

type Row = { file: ProjectFile; depth: number; parent: string; position: number; size: number };
function rowsFor(children: Map<string, ProjectFile[]>, expanded: Set<string>, query: string): Row[] {
  const sorted = (files: ProjectFile[]) => [...files].sort((a, b) => Number(b.is_dir) - Number(a.is_dir) || a.name.localeCompare(b.name, "zh-CN"));
  if (query) {
    const files = sorted([...children.values()].flat().filter(file => file.path.toLowerCase().includes(query.toLowerCase())));
    return files.map((file, index) => ({ file, depth: 0, parent: "", position: index + 1, size: files.length }));
  }
  const visit = (directory: string, depth: number): Row[] => {
    const files = sorted(children.get(directory) ?? []);
    return files.flatMap((file, index) => [
      { file, depth, parent: directory, position: index + 1, size: files.length }, ...(file.is_dir && expanded.has(file.path) ? visit(file.path, depth + 1) : []),
    ]);
  };
  return visit("", 0);
}

export function ProjectFilesApp({ host, owner }: { host: PluginHost; owner: Owner }) {
  const [children, setChildren] = useState(new Map<string, ProjectFile[]>()), [expanded, setExpanded] = useState(new Set<string>());
  const [query, setQuery] = useState(""), [listStatus, setListStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [listError, setListError] = useState<{ directory: string; message: string } | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null), [selectedDirectory, setSelectedDirectory] = useState<ProjectFile | null>(null);
  const [adding, setAdding] = useState(false), [feedback, setFeedback] = useState<{ status: "success" | "failed"; message: string } | null>(null);
  const [focusedPath, setFocusedPath] = useState<string | null>(null);
  const listOperation = useRef<object | null>(null), readOperation = useRef<object | null>(null), addOperation = useRef<object | null>(null);
  const nodes = useRef(new Map<string, HTMLButtonElement>()), focusRequest = useRef<string | null>(null);
  const rows = useMemo(() => rowsFor(children, expanded, query), [children, expanded, query]);
  const focusPath = rows.some(row => row.file.path === focusedPath) ? focusedPath : rows[0]?.file.path;
  useLayoutEffect(() => {
    const path = focusRequest.current;
    if (path && nodes.current.has(path)) { nodes.current.get(path)?.focus(); focusRequest.current = null; }
  }, [rows, focusedPath]);

  async function load(directory = "") {
    if (!owner.active || listOperation.current || addOperation.current) return;
    const operation = {}; listOperation.current = operation; setListStatus("loading"); setListError(null);
    if (!directory) { readOperation.current = null; setChildren(new Map()); setExpanded(new Set()); setPreview(null); setSelectedDirectory(null); setFeedback(null); }
    try {
      const files = parseFiles(await request(host, "list", directory ? { directory } : {}));
      if (!owner.active || listOperation.current !== operation) return;
      setChildren(current => new Map(current).set(directory, files));
      if (directory) setExpanded(current => new Set(current).add(directory));
      setListStatus("ready");
    } catch (error) {
      if (owner.active && listOperation.current === operation) { setListError({ directory, message: errorMessage(error) }); setListStatus("failed"); }
    } finally { if (listOperation.current === operation) listOperation.current = null; }
  }
  async function read(file: ProjectFile) {
    if (!owner.active || addOperation.current) return;
    const operation = {}; readOperation.current = operation; setSelectedDirectory(null); setPreview({ file, status: "loading" }); setFeedback(null);
    try {
      const content = parseContent(await request(host, "read", { path: file.path }), file.path);
      if (owner.active && readOperation.current === operation) setPreview({ file, content, status: "ready" });
    } catch (error) {
      if (owner.active && readOperation.current === operation) setPreview({ file, status: "failed", error: errorMessage(error) });
    } finally { if (readOperation.current === operation) readOperation.current = null; }
  }
  function collapse(path: string) { setExpanded(current => { const next = new Set(current); next.delete(path); return next; }); }
  function select(file: ProjectFile) {
    if (!owner.active || addOperation.current || listOperation.current) return;
    setFocusedPath(file.path);
    if (!file.is_dir) { void read(file); return; }
    readOperation.current = null; setPreview(null); setSelectedDirectory(file); setFeedback(null);
    if (expanded.has(file.path)) collapse(file.path);
    else if (children.has(file.path)) setExpanded(current => new Set(current).add(file.path));
    else void load(file.path);
  }
  async function add(file: ProjectFile) {
    if (!owner.active || addOperation.current || readOperation.current || preview?.status !== "ready" || preview.file.path !== file.path) return;
    const operation = {}; addOperation.current = operation; setAdding(true); setFeedback(null);
    try {
      confirmed(await request(host, "add", { path: file.path, expectedIsDirectory: false }));
      if (owner.active && addOperation.current === operation) setFeedback({ status: "success", message: `已将“${file.name}”添加到会话` });
    } catch (error) {
      if (owner.active && addOperation.current === operation) setFeedback({ status: "failed", message: errorMessage(error) });
    } finally { if (addOperation.current === operation) { addOperation.current = null; if (owner.active) setAdding(false); } }
  }
  function focus(path: string) { focusRequest.current = path; setFocusedPath(path); nodes.current.get(path)?.focus(); }
  function keyDown(event: KeyboardEvent<HTMLButtonElement>, row: Row, index: number) {
    if (listOperation.current || addOperation.current) return;
    const { file } = row;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); const next = rows[index + (event.key === "ArrowDown" ? 1 : -1)]; if (next) focus(next.file.path); }
    else if (event.key === "Home" || event.key === "End") { event.preventDefault(); const next = event.key === "Home" ? rows[0] : rows[rows.length - 1]; if (next) focus(next.file.path); }
    else if (event.key === "ArrowLeft") { event.preventDefault(); if (file.is_dir && expanded.has(file.path)) collapse(file.path); else if (row.parent) focus(row.parent); }
    else if (event.key === "ArrowRight" && file.is_dir && !query) { event.preventDefault(); if (expanded.has(file.path)) { const child = rows[index + 1]; if (child?.parent === file.path) focus(child.file.path); } else if (children.has(file.path)) { setExpanded(current => new Set(current).add(file.path)); } else void load(file.path); }
  }
  useEffect(() => {
    void load();
    return () => { listOperation.current = null; readOperation.current = null; addOperation.current = null; nodes.current.clear(); };
  }, [host, owner]);
  return <section className="pf">
    <div className="pf-head"><PageHeader title="项目文件" actions={<ControlButton variant="outline" loading={listStatus === "loading"} disabled={adding} onClick={() => void load()}><RefreshCw size={16} aria-hidden="true" />重新读取</ControlButton>} />
      <div className="pf-search"><Field label="搜索当前列表">{props => <Input {...props} type="search" value={query} disabled={adding} onChange={event => setQuery(event.target.value)} placeholder="文件名或路径" />}</Field><Badge>{rows.length} 项</Badge></div>
    </div>
    <div className="pf-main"><nav className="pf-list" aria-label="项目文件">
      {listError ? <ErrorState title="目录读取失败" description={listError.message} action={<ControlButton variant="outline" disabled={adding} onClick={() => void load(listError.directory)}>重新读取目录</ControlButton>} /> : null}
      {listStatus === "loading" ? <Spinner label="正在读取目录" /> : null}
      {rows.length ? <div role="tree" aria-label="项目文件树" aria-busy={listStatus === "loading"}>{rows.map((row, index) => {
        const { file, depth } = row; const selected = selectedDirectory?.path === file.path || preview?.file.path === file.path;
        return <ControlButton key={file.path} ref={node => { if (node) nodes.current.set(file.path, node); else nodes.current.delete(file.path); }}
          className="pf-row" variant="ghost" role="treeitem" aria-level={depth + 1} aria-posinset={row.position} aria-setsize={row.size} aria-selected={selected} aria-expanded={file.is_dir ? expanded.has(file.path) : undefined}
          tabIndex={focusPath === file.path ? 0 : -1} disabled={listStatus === "loading" || adding} title={file.path} style={{ "--pf-depth": depth } as CSSProperties}
          onFocus={() => setFocusedPath(file.path)} onKeyDown={event => keyDown(event, row, index)} onClick={() => select(file)}>
          <span className="pf-chevron">{file.is_dir ? expanded.has(file.path) ? <ChevronDown size={14} /> : <ChevronRight size={14} /> : null}</span>
          {file.is_dir ? <Folder size={17} aria-hidden="true" /> : <File size={17} aria-hidden="true" />}<span className="pf-name">{file.name}</span>{!file.is_dir ? <span className="pf-size">{fileSize(file.size)}</span> : null}
        </ControlButton>;
      })}</div> : listStatus === "ready" ? <EmptyState title={query ? "没有匹配的文件" : "项目文件夹为空"} /> : null}
    </nav><section className="pf-preview" aria-label="预览"><FilePreview preview={preview} selectedDirectory={selectedDirectory} onRead={file => void read(file)} onAdd={file => void add(file)} adding={adding} feedback={feedback} /></section></div>
  </section>;
}
