import { createRoot, type Root } from "react-dom/client";
import { ErrorState } from "@xsec/ui-react";
import tokenStyles from "@xsec/design-tokens/styles.css";
import componentStyles from "@xsec/ui-react/styles.css";
import styles from "./styles.css";
import { ProjectFilesApp } from "./app";
import { contextIdentity, errorMessage, type Owner, type PluginHost } from "./host";
import { PluginTheme } from "./theme";

export function activate(host: PluginHost) {
  let root: Root | undefined, identity: string | undefined, owner: Owner = { active: false }, revision = 0;
  console.debug("project-files.activate");
  function render(context: unknown) {
    let error: string | undefined;
    let next: string | undefined;
    try { next = contextIdentity(context); } catch (cause) { error = errorMessage(cause); }
    if (next !== identity || !owner.active) { owner.active = false; owner = { active: !error }; identity = next; revision += 1; }
    root?.render(<><style>{tokenStyles + componentStyles + styles}</style><PluginTheme host={host}>{error ? <ErrorState title="项目文件不可用" description={error} /> : <ProjectFilesApp key={revision} host={host} owner={owner} />}</PluginTheme></>);
  }
  return {
    mount(element: HTMLElement, context = host.context) {
      if (root) throw new Error("项目文件控制器已经挂载");
      root = createRoot(element); console.info("project-files.mount"); render(context);
    },
    update(context = host.context) { console.debug("project-files.update"); render(context); },
    dispose() { console.debug("project-files.dispose"); owner.active = false; root?.unmount(); root = undefined; identity = undefined; },
  };
}
