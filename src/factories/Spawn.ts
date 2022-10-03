import { IVisualCodeShim } from "../models/interfaces/IVisualCodeShim";
import { SpawnService } from "../services/SpawnService";

export type SpawnServiceFactoryType = (
  ui: IVisualCodeShim,
  mirrorOutput?: boolean
) => SpawnService;

export default (ui: IVisualCodeShim, mirrorOutput: boolean = true) => {
  return new SpawnService(ui, mirrorOutput);
};
