import * as vscode from "vscode";
import { getIconForGitStatus } from "../util";
import { BaseTreeDataProvider } from "./base";
import { CommitFile } from "../types";
import path from "path";

export class ListTreeDataProvider extends BaseTreeDataProvider<ListFile> {
  getTreeItem(element: ListFile): vscode.TreeItem {
    return element;
  }

  getChildren(): Thenable<ListFile[]> {
    try {
      const listFiles = this.files.map((file) => new ListFile(file));
      return Promise.resolve(listFiles);
    } catch (error) {
      vscode.window.showErrorMessage(
        "Failed to load last commit files: " + error
      );
      return Promise.resolve([]);
    }
  }
}

class ListFile extends vscode.TreeItem {
  constructor(file: CommitFile) {
    const filename = path.basename(file.relativePath);
    super(filename, vscode.TreeItemCollapsibleState.None);

    this.command = {
      command: "vscode.open",
      title: "Open File",
      arguments: [vscode.Uri.file(file.absolutePath)],
    };

    this.tooltip = `${file.status}: ${file.absolutePath}`;
    this.iconPath = getIconForGitStatus(file.status);
    this.description = file.relativePath;
  }
}
