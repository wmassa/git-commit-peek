import { execSync } from "child_process";
import * as path from "path";
import * as vscode from "vscode";

export function getChangedGitFiles(): {
  relativePath: string;
  absolutePath: string;
  status: string;
}[] {
  const repoPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  if (!repoPath) {
    return [];
  }

  // Format: A\tfile.txt\nM\tfile2.txt\nD\tfile3.txt
  const output = execSync(
    'git show --relative --name-status --pretty="" HEAD',
    {
      cwd: repoPath,
    }
  ).toString();

  return output
    .trim()
    .split("\n")
    .map((line) => {
      const [status, relativePath] = line.split(/\t/);
      if (!relativePath) {
        return undefined;
      }
      return {
        relativePath,
        status,
        absolutePath: path.join(repoPath, relativePath),
      };
    })
    .filter((a) => a !== undefined);
}

export function getIconForGitStatus(status: string): vscode.ThemeIcon {
  switch (status) {
    case "A":
      return new vscode.ThemeIcon("diff-added");
    case "M":
      return new vscode.ThemeIcon("diff-modified");
    case "D":
      return new vscode.ThemeIcon("diff-removed");
    default:
      return new vscode.ThemeIcon("file");
  }
}
