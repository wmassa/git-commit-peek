import path from "path";
import * as vscode from "vscode";
import { getIconForGitStatus } from "../util";
import { BaseTreeDataProvider } from "./base";

export class FileTreeDataProvider extends BaseTreeDataProvider<FileTreeItem> {
  getTreeItem(element: FileTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: FileTreeItem): Thenable<FileTreeItem[]> {
    if (!this.workspaceRoot) {
      vscode.window.showInformationMessage("No workspace folder");
      return Promise.resolve([]);
    }

    if (element) {
      // Get children of a directory
      return Promise.resolve(this.getDirectoryChildren(element.filePath));
    } else {
      // Get root items
      return Promise.resolve(this.getRootItems());
    }
  }

  private getRootItems(): FileTreeItem[] {
    return this.getDirectoryItems(this.workspaceRoot);
  }

  private getDirectoryChildren(dirPath: string): FileTreeItem[] {
    return this.getDirectoryItems(dirPath);
  }

  /**
   * Shared logic for getting items (files and directories) under a given directory path.
   */
  private getDirectoryItems(baseDir: string): FileTreeItem[] {
    const items: FileTreeItem[] = [];
    const processedDirs = new Set<string>();

    // Filter files that are children of this directory
    const childFiles = this.files.filter((file) => {
      const relativePath = path.relative(baseDir, file.absolutePath);
      return !relativePath.startsWith("..") && relativePath !== "";
    });

    for (const file of childFiles) {
      const relativePath = path.relative(baseDir, file.absolutePath);
      const parts = relativePath.split(path.sep);

      if (parts.length === 1) {
        // Direct child file
        items.push(
          new FileTreeItem(parts[0], file.absolutePath, false, file.status)
        );
      } else {
        // Child directory
        const childDir = parts[0];
        const childDirPath = path.join(baseDir, childDir);

        if (!processedDirs.has(childDir)) {
          processedDirs.add(childDir);
          items.push(
            new FileTreeItem(childDir, childDirPath, true, file.status)
          );
        }
      }
    }

    return items.sort((a, b) => {
      // Directories first, then files
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.label.localeCompare(b.label);
    });
  }
}

class FileTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly filePath: string,
    public readonly isDirectory: boolean,
    public readonly status: string
  ) {
    super(
      label,
      isDirectory
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.None
    );

    this.tooltip = this.filePath;
    this.contextValue = isDirectory ? "directory" : "file";

    if (!isDirectory) {
      this.command = {
        command: "vscode.open",
        title: "Open File",
        arguments: [vscode.Uri.file(filePath)],
      };

      this.iconPath = getIconForGitStatus(status);
    } else {
      this.iconPath = new vscode.ThemeIcon("folder");
    }
  }
}
