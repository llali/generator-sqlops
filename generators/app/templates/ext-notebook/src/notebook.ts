'use strict';

import * as vscode from 'vscode';
import * as azdata from 'azdata';
import * as path from 'path';
import * as fs from 'fs';

// Each notebook or markdown file packaged with your extension will be found through this
// function so that they can be individually opened through the `showNotebookDocument` command.
const extractNotebooksFromFolder = (fullFolderPath: string) => {
    let notebookNames: Array<string> = [];
    const files = getFolderContent(fullFolderPath);
    files.forEach(fileName => {
        let fileExtension = path.extname(fileName).toLowerCase();
        if (fileExtension === '.ipynb' || fileExtension === '.md') {
            let fullFilePath = path.join(fullFolderPath, fileName)
            notebookNames.push(path.normalize(fullFilePath));
        }
    })
    return notebookNames;
}

// This is a wrapper to read each file in the extensions folder.
const getFolderContent = (folderPath: string) => {
    try {
        return fs.readdirSync(folderPath);
    } catch (e) {
        vscode.window.showErrorMessage("Unable to access " + folderPath + ": " + e.message);
        return [];
    }
}

// This function is called when you run the command `Launch Notebooks: <%= name %>` from
// command palette in Azure Data Studio. If you would like any additional functionality
// to occur when you launch the book, add to the activate function.
export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand('launchNotebooks.<%= name %>', () => {
        let notebooksToDisplay: Array<string> = extractNotebooksFromFolder(context.extensionPath);
        notebooksToDisplay.forEach(name => {
            azdata.nb.showNotebookDocument(vscode.Uri.file(name));
        });
    }));
}
