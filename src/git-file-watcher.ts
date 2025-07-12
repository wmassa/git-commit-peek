import * as vscode from "vscode";

export function createGitFileWatcher(
  refreshFunction: () => void
): vscode.Disposable {
  const watchers: vscode.FileSystemWatcher[] = [];
  let debounceTimer: NodeJS.Timeout | undefined;

  const debouncedRefresh = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      refreshFunction();
    }, 2000);
  };

  const gitFiles = [
    "**/.git/HEAD", // Branch switches, most commits
    "**/.git/logs/HEAD", // All commits, amends, resets (most reliable)
    "**/.git/index", // Staging area changes
    "**/.git/refs/heads/**", // Local branch updates (covers commits too)
  ];

  gitFiles.forEach((pattern) => {
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);

    const handler = () => debouncedRefresh();

    watcher.onDidChange(handler);
    watcher.onDidCreate(handler);
    watcher.onDidDelete(handler);

    watchers.push(watcher);
  });

  return vscode.Disposable.from(...watchers, {
    dispose: () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    },
  });
}
