import path = require("path");
import * as vscode from "vscode";

import { IVisualCodeDocumentShim } from "./models/interfaces/IVisualCodeDocumentShim";
import { IVisualCodeShim } from "./models/interfaces/IVisualCodeShim";
import { PHPClassInfo } from "./models/PHPClassInfo";
import { PHPTestFunctionInfo } from "./models/PHPTestFunctionInfo";
import { PHPUnitTestProjectInfo } from "./models/PHPUnitTestProjectInfo";
import { VisualCodeDocumentShim } from "./models/VisualCodeDocumentShim";
import { ComposerSetupService } from "./services/ComposerSetupService";
import { PHPDocumentEditorService } from "./services/PHPDocumentEditorService";
import { PHPUnitTestBuilderService } from "./services/PHPUnitTestBuilderService";
import { PHPUnitTestProjectService } from "./services/PHPUnitTestProjectService";
import { PHPUnitTestRunnerService } from "./services/PHPUnitTestRunnerService";

export class Workflow {
  private _ui: IVisualCodeShim;
  private _project: PHPUnitTestProjectService;
  private _runner: PHPUnitTestRunnerService;
  private _editor: PHPDocumentEditorService;
  private _builder: PHPUnitTestBuilderService;
  private _composer: ComposerSetupService;
  private _packagesRequired: Array<string>;
  private _packagesDevelopment: Array<string>;

  constructor(
    ui: IVisualCodeShim,
    project: PHPUnitTestProjectService,
    runner: PHPUnitTestRunnerService,
    editor: PHPDocumentEditorService,
    builder: PHPUnitTestBuilderService,
    composer: ComposerSetupService
  ) {
    this._ui = ui;
    this._project = project;
    this._runner = runner;
    this._editor = editor;
    this._builder = builder;
    this._composer = composer;
    this._packagesRequired = ui.configuration.composer.packagesRequired;
    this._packagesDevelopment = ui.configuration.composer.packagesDevelopment;
  }

  private async doRunUnitTest(
    document: IVisualCodeDocumentShim,
    functionInfo: PHPTestFunctionInfo,
    projectInfo: PHPUnitTestProjectInfo
  ) {
    try {
      this._ui.clearDiagnostics(document, functionInfo.entity.identifier);

      await this._runner.runUnitTest(
        projectInfo.workspacePath,
        functionInfo,
        document.getFullPath()
      );
      // this._ui.addDiagnostic(editor.document, info.entity.identifier, range,
      //     "Unit test passed", vscode.DiagnosticSeverity.Information
      // );
    } catch (e) {
      this._ui.addDiagnostic(
        document,
        functionInfo.entity.identifier,
        functionInfo.entity.startLineNumber - 1,
        document.getLineFirstNonWhitespaceCharacterIndex(
          functionInfo.entity.startLineNumber - 1
        ),
        functionInfo.entity.endLineNumber - 1,
        document.getLineTextAt(functionInfo.entity.endLineNumber - 1).length,
        "Unit test failed"
      );
      // throw e;
    }
  }

  async createUnitTestDirectory() {
    const info = vscode.window.activeTextEditor
      ? this._project.getInfoForDocument(
          new VisualCodeDocumentShim(
            vscode.window.activeTextEditor.document,
            vscode.window.activeTextEditor
          )
        )
      : await this._project.getInfoForWorkspaceFolder();
    if (!info) {
      return;
    }

    const workspaceInfo = info;
    if (info.unitTestPathExists) {
      if (
        !(await new Promise((resolve, reject) => {
          try {
            vscode.window
              .showQuickPick(
                [
                  'Cancel (leave "' + workspaceInfo.unitTestPath + '" as-is)',
                  'Delete and recreate unit test folder for "' +
                    workspaceInfo.unitTestPath +
                    '"?',
                ],
                { canPickMany: false }
              )
              .then(async (x) => {
                resolve(x && x[0] === "D");
              });
          } catch (e) {
            reject(e);
          }
        }))
      ) {
        return;
      }
    }

    let msg: string;
    try {
      this._ui.appendToOutputChannel("Setting up unit test project");
      this._ui.showOutputChannel();
      await this._project.createUnitTestDirectory(workspaceInfo.unitTestPath);
      if (
        this._packagesRequired.length + this._packagesDevelopment.length >
        0
      ) {
        await this._composer.checkRequirements(
          workspaceInfo.workspacePath,
          this._packagesRequired,
          this._packagesDevelopment
        );
      }
      await this._composer.assignNamespace(
        "PHPTDD",
        path.relative(workspaceInfo.workspacePath, workspaceInfo.unitTestPath),
        workspaceInfo.workspacePath
      );
      msg = "Workspace is ready for unit testing";
      this._ui.showInformationMessage(msg);
    } catch (e: any) {
      msg =
        "Problems were encountered preparing the workspace for unit testing";
      this._ui.appendToOutputChannel(e.toString());
      this._ui.showWarningMessage(msg);
    }
    this._ui.appendToOutputChannel("*** " + msg + " ***");
  }

  protected async doEditUnitTest(
    functionInfo: PHPTestFunctionInfo,
    document: IVisualCodeDocumentShim
  ) {
    let testFunctionName: string;
    let useBaseTestCase: boolean;

    if (functionInfo.hasTestFunction) {
      testFunctionName = functionInfo.functionName;
    } else {
      const defaultName = this._runner.getDefaultTestFunctionName(
        functionInfo.entity
      );
      const i = defaultName.length;

      const inputResult = await vscode.window.showInputBox({
        prompt: "Enter name of test method for " + functionInfo.entity.name,
        value: defaultName,
        valueSelection: [i, i],
      });

      if (!inputResult) {
        return;
      }

      testFunctionName = inputResult;

      this._editor.addTestFunction(
        testFunctionName,
        functionInfo.entity,
        document
      );
    }

    const projectInfo = this._project.getInfoForDocument(document);

    if (projectInfo.unitTestPathExists) {
      useBaseTestCase = projectInfo.phpTDDBootstrapExists;
    } else {
      await this.createUnitTestDirectory();
      useBaseTestCase = true;
    }

    await this._builder.editUnitTestFunction(
      testFunctionName,
      useBaseTestCase,
      functionInfo.entity,
      document.getFullPath(),
      projectInfo.workspacePath
    );
  }

  async runUnitTest(document: IVisualCodeDocumentShim) {
    if (document.isUntitled) {
      this._ui.showWarningMessage(
        "Source file must be saved and named before creating unit tests for it"
      );

      return;
    }

    const info = await this._runner.getCurrentTestFunction(document);

    if (info) {
      const projectInfo = this._project.getInfoForDocument(document);

      if (
        (info.entity instanceof PHPClassInfo || info.hasTestFunction) &&
        projectInfo.unitTestPathExists
      ) {
        try {
          this._ui.lastTestFunctionInfo = info;
          this._ui.showStatusBarMessage("$(clock) Running unit test...");
          await this.doRunUnitTest(document, info, projectInfo);
          this._ui.showStatusBarMessage(
            "$(check) Unit test passed for " + info.entity.name,
            "Edit unit test " + info.functionName,
            "phptdd.editLastUnitTest"
          );
        } catch (e) {
          // this._ui.outputChannel.show();
          this._ui.showStatusBarMessage(
            "$(circle-slash) Unit test failed for " + info.entity.name,
            "Edit unit test " + info.functionName,
            "phptdd.editLastUnitTest"
          );
        }
      } else {
        this._ui.lastTestFunctionInfo = undefined;
        await this.doEditUnitTest(info, document);
      }
    } else {
      this._ui.lastTestFunctionInfo = undefined;
      this._ui.showStatusBarMessage(
        "$(stop) Cursor is not on a testable entity"
      );
    }
  }
}
