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

  // Watch key git state files that change on branch switches and updates.
  // - HEAD: points to the current branch (or commit in detached state)
  // - logs/HEAD: updates when HEAD moves (useful for some flows)
  // - index: the staging area, updated by many git operations
  // - refs/heads/**: branch tip refs; changes when branches advance or switch
  const gitPatterns = ["HEAD", "logs/HEAD", "index", "refs/heads/**"];

  // Find the closest git directory.
  // Note: In standard repos, ".git" is a directory. In several common setups,
  // ".git" is a FILE that contains a pointer to the real git dir:
  //   - Worktrees (created via `git worktree`): `.git` contains `gitdir: /path/to/main/.git/worktrees/<name>`
  //   - Submodules: `.git` often contains `gitdir: ../../.git/modules/<submodule>`
  //   - Separate git dir (`git init --separate-git-dir`): `.git` contains `gitdir: /custom/location`
  // We detect both cases and resolve to the actual git directory to attach watchers reliably.
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (workspaceFolder) {
    let dir = workspaceFolder.uri.fsPath;
    let gitDir: string | null = null;

    // Check current and parent directories
    while (dir !== path.dirname(dir)) {
      const gitPath = path.join(dir, ".git");
      if (fs.existsSync(gitPath)) {
        try {
          const stat = fs.statSync(gitPath);
          if (stat.isDirectory()) {
            gitDir = gitPath;
          } else if (stat.isFile()) {
            // `.git` is a file: parse its contents to find the real git directory.
            // Format is typically: `gitdir: <absolute-or-relative-path>`.
            const content = fs.readFileSync(gitPath, "utf8");
            const match = content.match(/gitdir:\s*(.+)\s*/i);
            if (match && match[1]) {
              const candidate = match[1].trim();
              // Resolve relative paths against the repository root `dir`.
              gitDir = path.isAbsolute(candidate)
                ? candidate
                : path.resolve(dir, candidate);
            }
          }
          if (gitDir) {
            break;
          }
        } catch {
          // ignore errors and continue up
        }
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
