import { ControlButton, EmptyState, ErrorState, Spinner } from "@xsec/ui-react";
import type { ProjectFile } from "./host";

export type Preview = { file: ProjectFile; status: "loading" } | { file: ProjectFile; status: "failed"; error: string } | { file: ProjectFile; status: "ready"; content: string };
export function fileSize(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : bytes < 1_048_576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1_048_576).toFixed(1)} MB`;
}
// The existing preview tokenizer preserves the plugin's supported code languages.
function tokens(source: string, extension: string) {
  if (!["js", "ts", "jsx", "tsx", "py", "java", "go", "rs", "json", "css", "html"].includes(extension)) return source || " ";
  const comment = extension === "py" ? "#.*$" : extension === "html" ? "<!--.*?-->" : "\\/\\/.*$";
  const expression = new RegExp(`${comment}|"(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*'|\`(?:\\\\.|[^\`\\\\])*\`|\\b\\d+(?:\\.\\d+)?\\b|\\b(?:const|let|var|function|return|if|else|for|while|class|import|from|export|async|await|def|true|false|null|new|public|private)\\b`, "g");
  const result = []; let cursor = 0;
  for (const match of source.matchAll(expression)) {
    result.push(source.slice(cursor, match.index));
    const value = match[0];
    const kind = /^(?:\/\/|#|<!--)/.test(value) ? "comment" : /^["'`]/.test(value) ? "string" : /^\d/.test(value) ? "number" : "keyword";
    result.push(<span className={`pf-token-${kind}`} key={match.index}>{value}</span>);
    cursor = (match.index ?? 0) + value.length;
  }
  result.push(source.slice(cursor));
  return result;
}
export function FilePreview({ preview, selectedDirectory, onRead, onAdd, adding, feedback }: {
  preview: Preview | null; selectedDirectory: ProjectFile | null; onRead(file: ProjectFile): void; onAdd(file: ProjectFile): void;
  adding: boolean; feedback: { status: "success" | "failed"; message: string } | null;
}) {
  if (selectedDirectory) return <EmptyState title={selectedDirectory.name} />;
  if (!preview) return <EmptyState title="选择文件开始预览" />;
  const { file } = preview;
  return <article className="pf-file" aria-label="文件预览">
    <header className="pf-preview-head"><div><h2>{file.name}</h2><p className="pf-file-path">{file.path} · {fileSize(file.size)}</p></div>
      <ControlButton loading={adding} disabled={preview.status !== "ready"} onClick={() => onAdd(file)}>添加到会话</ControlButton>
    </header>
    {feedback?.status === "failed" ? <ErrorState title="引用添加失败" description={feedback.message} /> : feedback ? <p role="status" className="pf-success">{feedback.message}</p> : null}
    {preview.status === "loading" ? <Spinner label="正在读取文件" /> : preview.status === "failed" ? <ErrorState title="文件读取失败" description={preview.error} action={<ControlButton variant="outline" onClick={() => onRead(file)}>重新读取文件</ControlButton>} /> :
      <pre className="pf-code" tabIndex={0} aria-label={`${file.name} 代码正文`}><code>{preview.content.split("\n").map((line, index) => <span className="pf-line" key={index}><span className="pf-line-number" aria-hidden="true">{index + 1}</span><span>{tokens(line, file.path.split(".").pop()?.toLowerCase() ?? "")}</span></span>)}</code></pre>}
  </article>;
}
