// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

import Spawn from "./factories/Spawn";
import { Workflow } from "./workflow";
import { SpawnService } from "./services/SpawnService";
import { VisualCodeShim } from "./models/VisualCodeShim";
import { VisualCodeDocumentShim } from "./models/VisualCodeDocumentShim";
import { ComposerSetupService } from "./services/ComposerSetupService";
import { PHPFileParserService } from "./services/PHPFileParserService";
import { PHPUnitTestProjectService } from "./services/PHPUnitTestProjectService";
import { PHPUnitTestRunnerService } from "./services/PHPUnitTestRunnerService";
import { PHPDocumentEditorService } from "./services/PHPDocumentEditorService";
import { PHPUnitTestBuilderService } from "./services/PHPUnitTestBuilderService";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "testrunner" is now active!');

  const ui = new VisualCodeShim();
  const project = new PHPUnitTestProjectService(ui, "templates/source");
  const spawn = new SpawnService(ui, true);
  const editor = new PHPDocumentEditorService();
  const composer = new ComposerSetupService(ui, Spawn);
  const fileParser = new PHPFileParserService(Spawn, ui);
  const runner = new PHPUnitTestRunnerService(ui, fileParser, spawn);
  const builder = new PHPUnitTestBuilderService(ui, fileParser, composer);
  const workflow = new Workflow(ui, project, runner, editor, builder, composer);

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "testrunner.helloWorld",
    () => {
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      vscode.window.showInformationMessage("Hello World from TestRunner!");
    }
  );

  context.subscriptions.push(disposable);

  const cmdRunUnitTest = vscode.commands.registerCommand(
    "testrunner.runUnitTest",
    async () => {
      try {
        const editor = vscode.window.activeTextEditor;

        if (editor) {
          await workflow.runUnitTest(
            new VisualCodeDocumentShim(editor.document, editor)
          );
        }
      } catch (error: any) {
        vscode.window.showWarningMessage(error.toString());
      }
    }
  );

  context.subscriptions.push(cmdRunUnitTest);
}

// this method is called when your extension is deactivated
export function deactivate() {}
