import { IVisualCodePositionShim } from "./interfaces/IVisualCodePositionShim";

export class VisualCodePositionShim implements IVisualCodePositionShim {
  constructor(
    public readonly line: number,
    public readonly character: number
  ) {}
}
