export interface Subscription { dispose(): void; }
export interface PluginHost {
  readonly context: unknown;
  request(method: string, params?: Record<string, unknown>): Promise<unknown>;
  onTheme(listener: (theme: Record<string, string>) => void): Subscription;
}
export interface Owner { active: boolean; }
export interface ProjectFile { name: string; path: string; is_dir: boolean; size: number; }

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Host 返回格式无效");
  return value as Record<string, unknown>;
}
export function contextIdentity(context: unknown): string {
  const value = record(context);
  const workspace = value.workspace == null ? undefined : record(value.workspace);
  const binding = workspace?.binding == null ? undefined : record(workspace.binding);
  const project = value.project == null ? undefined : record(value.project);
  const projectId = binding?.projectId ?? project?.id;
  if (typeof projectId !== "string" || !projectId) throw new Error("当前工作区没有绑定项目");
  const sessionId = binding?.sessionId;
  if (sessionId != null && typeof sessionId !== "string") throw new Error("当前工作区会话绑定无效");
  return JSON.stringify([projectId, sessionId ?? null]);
}
export function parseFiles(value: unknown): ProjectFile[] {
  const data = record(value);
  if (!Array.isArray(data.files)) throw new Error("项目文件列表返回格式无效");
  const paths = new Set<string>();
  return data.files.map(value => {
    const file = record(value);
    if (typeof file.name !== "string" || !file.name || typeof file.path !== "string" || !file.path
      || typeof file.is_dir !== "boolean" || typeof file.size !== "number" || !Number.isSafeInteger(file.size) || file.size < 0
      || paths.has(file.path)) throw new Error("项目文件条目返回格式无效");
    paths.add(file.path);
    return { name: file.name, path: file.path, is_dir: file.is_dir, size: file.size };
  });
}
export function parseContent(value: unknown, path: string): string {
  const data = record(value);
  if (data.path !== path || typeof data.content !== "string") throw new Error("项目文件正文返回格式无效");
  return data.content;
}
export function confirmed(value: unknown): void {
  if (record(value).ok !== true) throw new Error("会话引用未确认添加成功");
}
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error) return error;
  return "Host 请求失败：错误返回格式无效";
}
export async function request(host: PluginHost, operation: "list" | "read" | "add", params: Record<string, unknown>): Promise<unknown> {
  const operationId = crypto.randomUUID();
  const start = performance.now();
  console.info("project-files.operation.started", { operationId, operation });
  try {
    const result = await host.request({ list: "xsec.files.list", read: "xsec.files.read", add: "xsec.workspace.composer.path.add" }[operation], params);
    console.info("project-files.operation.completed", { operationId, operation, elapsedMs: Math.round(performance.now() - start) });
    return result;
  } catch (error) {
    if (error instanceof Error && error.message === "plugin frontend disposed") {
      console.debug("project-files.operation.cancelled", { operationId, operation, outcome: "cancelled", elapsedMs: Math.round(performance.now() - start) });
    } else {
      console.error("project-files.operation.failed", { operationId, operation, error_code: "HOST_REQUEST_FAILED", elapsedMs: Math.round(performance.now() - start) });
    }
    throw error;
  }
}
