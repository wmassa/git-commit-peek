import * as vscode from "vscode";
import { execSync } from "child_process";
import * as path from "path";
import { createGitFileWatcher } from "./git-file-watcher";

export async function activate(context: vscode.ExtensionContext) {
  const provider = new LastCommitTreeDataProvider();
  vscode.window.registerTreeDataProvider("lastCommitFiles", provider);

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "git-commit-peek.openFileFromCommit",
      (filePath: string) => {
        const fileUri = vscode.Uri.file(filePath);
        vscode.window.showTextDocument(fileUri);
      }
    )
  );

  createGitFileWatcher(provider.refresh.bind(provider));
}

class LastCommitTreeDataProvider
  implements vscode.TreeDataProvider<GitChangedFile>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    GitChangedFile | undefined | void
  > = new vscode.EventEmitter<GitChangedFile | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<
    GitChangedFile | undefined | void
  > = this._onDidChangeTreeData.event;

  getTreeItem(element: GitChangedFile): vscode.TreeItem {
    return element;
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getChildren(): Thenable<GitChangedFile[]> {
    try {
      const repoPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
      if (!repoPath) return Promise.resolve([]);

      // Format: A\tfile.txt\nM\tfile2.txt\nD\tfile3.txt
      const output = execSync(
        "git diff-tree --no-commit-id --name-status -r HEAD",
        {
          cwd: repoPath,
        }
      ).toString();

      const files: GitChangedFile[] = output
        .trim()
        .split("\n")
        .map((line) => {
          const [status, relativePath] = line.split(/\t/);
          const fullPath = path.join(repoPath, relativePath);
          return new GitChangedFile(relativePath, fullPath, status);
        });

      return Promise.resolve(files);
    } catch (error) {
      vscode.window.showErrorMessage(
        "Failed to load last commit files: " + error
      );
      return Promise.resolve([]);
    }
  }
}

class GitChangedFile extends vscode.TreeItem {
  constructor(label: string, fullPath: string, status: string) {
    super(label, vscode.TreeItemCollapsibleState.None);

    this.command = {
      command: "git-commit-peek.openFileFromCommit",
      title: "Open File",
      arguments: [fullPath],
    };

    this.tooltip = `${status}: ${fullPath}`;
    this.iconPath = getIconForGitStatus(status);
  }
}

function getIconForGitStatus(status: string): vscode.ThemeIcon {
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
