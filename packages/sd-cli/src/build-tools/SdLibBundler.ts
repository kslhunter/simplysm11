import {SdCliBuildResultUtil} from "../utils/SdCliBuildResultUtil";
import {ISdCliPackageBuildResult} from "../commons";
import {SdTsCompiler} from "./SdTsCompiler";
import ts from "typescript";
import path from "path";
import {FsUtil, PathUtil} from "@simplysm/sd-core-node";

export class SdLibBundler {
  readonly #compiler: SdTsCompiler;

  readonly #pkgPath: string;

  public constructor(pkgPath: string, dev: boolean) {
    this.#pkgPath = pkgPath;
    this.#compiler = new SdTsCompiler(
      pkgPath,
      {declaration: true},
      dev,
      path.resolve(pkgPath, "src/styles.scss")
    );
  }

  public markChanges(modifiedFileSet: Set<string>): void {
    this.#compiler.invalidate(modifiedFileSet);
  }

  public async buildAsync(): Promise<{
    program: ts.Program;
    watchFileSet: Set<string>;
    affectedFileSet: Set<string>;
    results: ISdCliPackageBuildResult[];
  }> {
    const buildResult = await this.#compiler.buildAsync();

    for (const affectedFilePath of buildResult.affectedFileSet) {
      const emittedFiles = buildResult.emittedFilesCacheMap.get(affectedFilePath) ?? [];
      for (const emittedFile of emittedFiles) {
        if (emittedFile.outRelPath != null) {
          const distPath = path.resolve(this.#pkgPath, "dist", emittedFile.outRelPath);
          if (PathUtil.isChildPath(distPath, path.resolve(this.#pkgPath, "dist"))) {
            await FsUtil.writeFileAsync(distPath, emittedFile.text);
          }
        }
      }

      const globalStylesheetResult = buildResult.stylesheetResultMap.get(affectedFilePath);
      if (globalStylesheetResult) {
        for (const outputFile of globalStylesheetResult.outputFiles) {
          const distPath = path.resolve(this.#pkgPath, "dist", path.relative(this.#pkgPath, outputFile.path));
          if (PathUtil.isChildPath(distPath, path.resolve(this.#pkgPath, "dist"))) {
            await FsUtil.writeFileAsync(distPath, outputFile.text);
          }
        }
      }
    }

    return {
      program: buildResult.program,
      watchFileSet: buildResult.watchFileSet,
      affectedFileSet: buildResult.affectedFileSet,
      results: [
        ...buildResult.typescriptDiagnostics.map((item) => SdCliBuildResultUtil.convertFromTsDiag(item, "build")),
        ...Array.from(buildResult.stylesheetResultMap.values()).mapMany(item => item.errors ?? [])
          .map(err => SdCliBuildResultUtil.convertFromEsbuildResult(err, "build", "error")),
        /*...Array.from(buildResult.stylesheetResultMap.values()).mapMany(item => item.warnings!)
          .map(warn => SdCliBuildResultUtil.convertFromEsbuildResult(warn, "build", "warning"))*/
      ]
    };
  }
}