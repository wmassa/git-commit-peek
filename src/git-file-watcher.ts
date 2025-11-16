import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

export function createGitFileWatcher(
  refreshFunction: () => void
): vscode.Disposable {
  const watchers: vscode.FileSystemWatcher[] = [];
  let debounceTimer: NodeJS.Timeout | undefined;

  const debouncedRefresh = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(refreshFunction, 2000);
  };

  const gitPatterns = ["HEAD", "logs/HEAD", "index", "refs/heads/**"];

  // Find the closest git directory
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (workspaceFolder) {
    let dir = workspaceFolder.uri.fsPath;
    let gitDir: string | null = null;

    // Check current and parent directories
    while (dir !== path.dirname(dir)) {
      if (fs.existsSync(path.join(dir, ".git"))) {
        gitDir = path.join(dir, ".git");
        break;
      }
      dir = path.dirname(dir);
    }

    if (gitDir) {
      gitPatterns.forEach((pattern) => {
        const watcher = vscode.workspace.createFileSystemWatcher(
          new vscode.RelativePattern(gitDir!, pattern)
        );
        watcher.onDidChange(debouncedRefresh);
        watcher.onDidCreate(debouncedRefresh);
        watcher.onDidDelete(debouncedRefresh);
        watchers.push(watcher);
      });
    }
  }

  return vscode.Disposable.from(...watchers, {
    dispose: () => clearTimeout(debounceTimer),
  });
}
