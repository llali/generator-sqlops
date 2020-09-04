'use strict';

import * as vscode from 'vscode';

// This function is called when you run the command `Launch Book: <%= name %>` from
// command palette in Azure Data Studio. If you would like any additional functionality
// to occur when you launch the book, add to the activate function.
export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand('launchBook.<%= name %>', () => {
        vscode.commands.executeCommand('bookTreeView.openBook', context.extensionPath, false)
    }));
}
