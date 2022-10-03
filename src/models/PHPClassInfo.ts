import { PHPEntityInfo } from "./PHPEntityInfo";
import { PHPFunctionInfo } from "./PHPFunctionInfo";

/**
 * Store information about a parsed PHP class entity
 */
export class PHPClassInfo extends PHPEntityInfo {
  readonly functions: Array<PHPFunctionInfo> = [];

  constructor(
    name: string,
    namespace: string | undefined,
    startLineNumber: number,
    endLineNumber: number = NaN
  ) {
    super(name, namespace, true, startLineNumber, endLineNumber);
  }

  public get identifier(): string {
    return this.name;
  }
}
