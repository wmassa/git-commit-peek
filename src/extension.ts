import * as vscode from "vscode";
import { createGitFileWatcher } from "./git-file-watcher";
import { FileTreeDataProvider } from "./tree-data-providers/file-tree";
import { getChangedGitFiles } from "./util";
import { ListTreeDataProvider } from "./tree-data-providers/list";

export async function activate(context: vscode.ExtensionContext) {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  let currentProvider: ListTreeDataProvider | FileTreeDataProvider;

  // Function to create and register the appropriate provider
  function createProvider() {
    const config = vscode.workspace.getConfiguration("git-commit-peek");
    const providerType = config.get<string>("treeViewType", "list");

    if (providerType === "tree") {
      currentProvider = new FileTreeDataProvider(workspaceRoot!);
    } else {
      currentProvider = new ListTreeDataProvider(workspaceRoot!);
    }

    vscode.window.registerTreeDataProvider("lastCommitFiles", currentProvider);

    currentProvider.setFiles(getChangedGitFiles());
  }

  // Initial provider creation
  createProvider();

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("git-commit-peek.treeViewType")) {
        createProvider();
      }
    })
  );

  createGitFileWatcher(() => {
    const files = getChangedGitFiles();
    currentProvider.setFiles(files);
  });
}
