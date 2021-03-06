/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';

var path = require('path');
var fs = require('fs');
let os = require('os')

exports.processNotebookFolder = (folderPath, generator) => {
    let errors = [];
    const count = findNotebookFiles(folderPath, errors, generator);

    if (count <= 0) {
        generator.log("No valid notebooks found in " + folderPath + (errors.length > 0 ? '.\n' + errors.join(os.EOL) : ''));
        return count;
    }

    generator.log(count + " notebook(s) found." + (errors.length > 0 ? '\n\nProblems while converting: \n' + errors.join(os.EOL) : ''));
    return count;
}

// Searches for all possible notebook or markdown files in specificed folder
const findNotebookFiles = (folderPath, errors, generator) => {
    let notebookCount = 0;
    const files = getFolderContent(folderPath, errors);
    files.forEach(fileName => {
        try {
            let extension = path.extname(fileName).toLowerCase();
            if (extension === '.ipynb' || extension === '.md') {
                notebookCount++;
                let filePath = path.join(folderPath, fileName);
                generator.extensionConfig.notebookNames.push(fileName);
                generator.extensionConfig.notebookPaths.push(filePath);
            }
        }
        catch (e) {
            console.log("Finding notebook files encountered an error: " + e.message);
        }
    });

    return notebookCount;
}

exports.processBookFolder = (folderPath, generator) => {
    let errors = [];
    try {
        generator.log("Jupyter Book found!" + (errors.length > 0 ? '\n\nProblems while converting: \n' + errors.join('\n') : ''));

        const count = discoverFoldersContainingNotebooks(folderPath, errors, generator);
        generator.log(count + " notebook(s) found! " + (errors.length > 0 ? '\n\nProblems while converting: \n' + errors.join('\n') : ''));
        return count;
    } catch (e) {
        generator.log("An unexpected error occurred: " + e.message);
    }
}

// Finds all possible locations for notebooks in specified folder
const discoverFoldersContainingNotebooks = (rootFolder, errors, generator) => {
    let totalNotebookCount = 0;
    const subfolders = getFolderContent(rootFolder);
    subfolders.forEach(dir => {
        let dirPath = path.join(rootFolder, dir);
        totalNotebookCount += findNotebookFiles(dirPath, errors, generator);
        generator.extensionConfig.notebookFolders.push(dir);
    })
    return totalNotebookCount;
}

const getFolderContent = (folderPath, errors) => {
    try {
        const stats = fs.statSync(folderPath);
        if (stats.isDirectory()) {
            return fs.readdirSync(folderPath);
        }
        return [];
    } catch (e) {
        errors.push("Unable to access " + folderPath + ": " + e.message);
        return [];
    }
}

exports.buildCustomBook = (context) => {
    try {
        customizeJupyterBook(context);
    } catch (e) {
        console.log("An unexpected error occurred: " + e.message);
    }
}

// Following functions are to perform file input/output to create a custom readme.md
// for each chapter and a custom toc.yml for the overall book in line with the
// SQL Server 2019 Jupyter Book in ADS
const customizeJupyterBook = (context) => {
    let tocContent = "";
    let idx = 0;

    const tocFilePath = path.join('.', '_data', 'toc.yml');
    const bookContentPath = path.join('.', 'content');
    const bookContents = fs.readdirSync(bookContentPath);

    bookContents.forEach(file => {
        try {
            const dirPath = path.join(bookContentPath, file);
            const stats = fs.statSync(dirPath);
            if (stats.isDirectory()) {
                if (context.chapterNames) {
                    const chapterFilePath = path.join('.', 'content', file);
                    const chapterTitle = context.chapterNames[idx];
                    tocContent += `- title: ${chapterTitle}\n  url: ${file}/readme\n  not_numbered: true\n  expand_sections: true\n  sections: \n`;
                    tocContent += writeForEachNotebook(file, chapterFilePath);
                    writeToReadme(chapterFilePath, file);
                    idx += 1;
                }
            } else {
                tocContent += writeSingleNotebook(bookContentPath, file);
            }
        } catch (e) {
            console.log(e.message);
        }
    });
    fs.writeFileSync(tocFilePath, tocContent);
}

const writeForEachNotebook = (chapter, notebookDir) => {
    let content = "";
    const notebooks = fs.readdirSync(notebookDir);
    notebooks.forEach(file => {
        if (file.indexOf('readme') === -1) {
            let fullFilePath = path.join(notebookDir, file);
            let fileName = path.basename(file);
            const slicedFileName = getSlicedFilename(fileName);
            let title = findTitle(file, fullFilePath);
            content += `  - title: ${title}\n    url: ${chapter.toLowerCase()}/${slicedFileName.toLowerCase()}\n`;
        }
    });
    return content;
}

const writeSingleNotebook = (notebookDir, file) => {
    let content = "";
    let fullFilePath = path.join(notebookDir, file);
    let fileName = path.basename(file);
    const slicedFileName = getSlicedFilename(fileName);
    let title = findTitle(file, fullFilePath);
    content += `- title: ${title}\n  url: ${slicedFileName.toLowerCase()}\n`;
    return content;
}

const getSlicedFilename = (fileName) => {
    if (path.extname(fileName) === '.ipynb') {
        return fileName.slice(0, -6);
    } else {
        return fileName.slice(0, -3);
    }
}

const writeToReadme = (contentFilePath, file) => {
    const readmeFilePath = path.join('.', 'content', file, 'readme.md');

    let fileContent = "## Notebooks in this Chapter\n";
    const files = fs.readdirSync(contentFilePath);
    files.forEach(file => {
        if (file.indexOf('readme') === -1) { // don't include readme because it already has its own place
            let fullFilePath = path.join(contentFilePath, file);
            let title = findTitle(file, fullFilePath);
            fileContent += `- [${title}](${file})\n`;
        }
    });
    fs.writeFileSync(readmeFilePath, fileContent);
}

// Need to grab title from inside each file, dependent on if markdown or notebook file
const findTitle = (file, filePath) => {
    const data = fs.readFileSync(filePath, 'utf-8');
    const lines = data.split(/\r?\n/);
    if (lines[0] === '' || (lines.length >= 7 && lines[6].indexOf("collapsed") > -1)) {
        return "Untitled";
    }
    if (path.extname(file) === '.ipynb') {
        let regexStr = lines[6].replace(/[:#"',]/g, '');
        return regexStr.replace(/\\n/g, '').trim();
    } else {
        if (path.extname(file) === '.md') {
            let regexStr = lines[0].replace(/[:#"',]/g, '');
            return regexStr.replace(/\\n/g, '').trim();
        }
    }
}