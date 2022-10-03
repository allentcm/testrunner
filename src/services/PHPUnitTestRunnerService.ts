import * as path from "path";
import { IVisualCodeDocumentShim } from "../models/interfaces/IVisualCodeDocumentShim";
import { IVisualCodeShim } from "../models/interfaces/IVisualCodeShim";
import { PHPClassInfo } from "../models/PHPClassInfo";
import { PHPEntityInfo } from "../models/PHPEntityInfo";
import { PHPFunctionInfo } from "../models/PHPFunctionInfo";
import { PHPTestFunctionInfo } from "../models/PHPTestFunctionInfo";
import { PHPFileParserService } from "./PHPFileParserService";
import { PHPUtility } from "./PHPUtility";
import { SpawnService } from "./SpawnService";

/**
 * This class includes functionality to run unit tests and trigger Visual Code
 * feedback on success/failure
 */
export class PHPUnitTestRunnerService {
  private _ui: IVisualCodeShim;
  private _parser: PHPFileParserService;
  private _spawn: SpawnService;
  private _testSubdirectory: string;
  private _runCommand: string;
  private _runAllCommand: string;
  private _runCodeCoverageCommand: string;
  private _codeCoverageReport: string;
  private _runDirectory: string;

  constructor(
    ui: IVisualCodeShim,
    parser: PHPFileParserService,
    spawn: SpawnService
  ) {
    this._ui = ui;
    this._parser = parser;
    this._spawn = spawn;
    this._testSubdirectory = ui.configuration.testSubdirectory;
    this._runCommand = ui.configuration.commands.runUnitTest;
    this._runAllCommand = ui.configuration.commands.runAllUnitTests;
    this._runCodeCoverageCommand = ui.configuration.commands.runCodeCoverage;
    this._codeCoverageReport = ui.configuration.commands.codeCoverageReport;
    this._runDirectory = ui.configuration.commands.directory;
  }

  /**
   * Parse out the test function from the comment
   * @param entity
   * @param document
   * @returns
   */
  protected getTestFunctionInfo(
    entity: PHPEntityInfo,
    document: IVisualCodeDocumentShim
  ): PHPTestFunctionInfo | undefined {
    if (entity) {
      let functionName = undefined;
      let disableAutoRun = false;

      if (entity.isTestClass()) {
        functionName = entity instanceof PHPClassInfo ? "" : entity.name;
      }

      if (entity.comment) {
        const comment = entity.comment;

        for (
          let lineNo = comment.startLineNumber;
          lineNo <= comment.endLineNumber;
          lineNo++
        ) {
          const line = document.getLineTextAt(lineNo);
          const matches = /@testFunction\s*(\S*)/g.exec(line);

          if (matches && matches.length > 0) {
            functionName = matches[1];
          }

          const matchesNoAutoRun = /@testDisableAutoRun/g.exec(line);
          if (matchesNoAutoRun && matchesNoAutoRun.length > 0) {
            disableAutoRun = true;
          }
        }
      }

      return new PHPTestFunctionInfo(entity, disableAutoRun, functionName);
    }
    return undefined;
  }

  /**
   * For the given PHP entity, return a default test function name
   * @param entity
   * @returns
   */
  getDefaultTestFunctionName(entity: PHPEntityInfo): string {
    if (entity instanceof PHPFunctionInfo && entity.class) {
      return (
        "test" +
        // PHPUtility.capitalizeFirstLetter(entity.class.name) +
        PHPUtility.capitalizeFirstLetter(entity.name)
      );
    } else {
      return "test" + PHPUtility.capitalizeFirstLetter(entity.name);
    }
  }

  /**
   * Get the current entity associated test function (if any) selected in the given editor
   * @param document
   * @returns
   */
  async getCurrentTestFunction(
    document: IVisualCodeDocumentShim
  ): Promise<PHPTestFunctionInfo | undefined> {
    const me = this;
    const text = document.getAllText();
    const entity = await this._parser.getEntityAtLineNumber(
      text,
      document.getSelectionStart().line + 1
    );

    if (entity && entity.testable) {
      return me.getTestFunctionInfo(entity, document);
    } else {
      return undefined;
    }
  }

  /**
   * For the given range of numbers, get a list of any test functions to run
   * (used by auto-run)
   *
   * @param document
   * @param lineNumbers
   * @returns
   */
  async getLineTestFunctions(
    document: IVisualCodeDocumentShim,
    lineNumbers: Array<number>
  ): Promise<Array<PHPTestFunctionInfo>> {
    const me = this;
    const text = document.getAllText();
    const results: Array<PHPTestFunctionInfo> = [];

    for (let lineNumber of lineNumbers) {
      let result = await this._parser.getEntityAtLineNumber(
        text,
        lineNumber + 1
      );

      if (result instanceof PHPEntityInfo && result.testable) {
        const functionInfo = me.getTestFunctionInfo(result, document);
        if (functionInfo) {
          let add = true;
          for (let info of results) {
            if (info.functionName === functionInfo.functionName) {
              add = false;
              break;
            }
          }
          if (add) {
            results.push(functionInfo);
          }
        }
      }
    }

    return results;
  }

  /**
   * Run the specified unit test function, optionally with code coverage
   * @param workspaceDirectory
   * @param functionInfo
   * @param documentPath
   * @param withCodeCoverage
   */
  async runUnitTest(
    workspaceDirectory: string,
    functionInfo?: PHPTestFunctionInfo,
    documentPath = "",
    withCodeCoverage = false
  ): Promise<void> {
    workspaceDirectory = path.normalize(workspaceDirectory);

    let filepath =
      path.normalize(this._testSubdirectory).replace(/\\/g, "/") +
      documentPath
        .substring(workspaceDirectory.length + 4)
        .replace(".php", "UnitTestCest");

    if (functionInfo && functionInfo.entity.isTestClass()) {
      filepath = documentPath
        .substring(workspaceDirectory.length + 1)
        .replace(".php", "");
    }

    const options = {
      __FUNCTION__: "",
      __TEST_SUBDIRECTORY__: filepath,
      __TEST_DIRECTORY__: path
        .normalize(path.join(workspaceDirectory, this._testSubdirectory))
        .replace(/\\/g, "/"),
      __WORKSPACE_DIRECTORY__: workspaceDirectory,
    };

    let cmd: string;
    let startIn: string;
    let msg: string;

    if (functionInfo) {
      msg = "Running unit test class";

      if (functionInfo.functionName) {
        options.__FUNCTION__ = functionInfo.functionName;
        msg = "Running unit test " + functionInfo.functionName;
      }

      cmd = PHPUtility.substituteValues(this._runCommand, options);
    } else {
      if (withCodeCoverage) {
        cmd = PHPUtility.substituteValues(
          this._runCodeCoverageCommand,
          options
        );
      } else {
        cmd = PHPUtility.substituteValues(this._runAllCommand, options);
      }
      msg = "Running all unit tests";
    }
    startIn = PHPUtility.substituteValues(this._runDirectory, options);

    this._ui.appendToOutputChannel("*** " + msg + " ***");

    this._ui.appendToOutputChannel('Command "' + cmd + '"');

    const output = await this._spawn
      .setCommandWithArguments(cmd)
      .setStartInDirectory(startIn)
      .run();

    if (output.indexOf("No tests executed") !== -1) {
      throw new Error("Unit testing was not executed, check your definition");
    }

    if (withCodeCoverage && this._codeCoverageReport) {
      this._spawn
        .setStartInDirectory(workspaceDirectory)
        .launchFile(
          PHPUtility.substituteValues(this._codeCoverageReport, options)
        );
    }
  }
}
