import * as vscode from "vscode";
import { CommitFile } from "../types";

export abstract class BaseTreeDataProvider<T extends vscode.TreeItem>
  implements vscode.TreeDataProvider<T>
{
  protected _onDidChangeTreeData: vscode.EventEmitter<T | undefined | void> =
    new vscode.EventEmitter<T | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<T | undefined | void> =
    this._onDidChangeTreeData.event;

  protected files: CommitFile[] = [];
  protected workspaceRoot: string;

  abstract getTreeItem(element: T): vscode.TreeItem;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  setFiles(files: CommitFile[]): void {
    this.files = files;
    this._onDidChangeTreeData.fire();
  }

  abstract getChildren(element?: T): Thenable<T[]>;
}
