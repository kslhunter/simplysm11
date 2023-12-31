import {FsUtil, Logger, PathUtil, SdFsWatcher} from "@simplysm/sd-core-node";
import path from "path";
import {ISdCliBuilderResult, ISdCliConfig, ISdCliLibPackageConfig, ISdCliPackageBuildResult} from "../commons";
import {EventEmitter} from "events";
import {SdTsCompiler} from "../build-tools/SdTsCompiler";
import {SdLinter} from "../build-tools/SdLinter";
import {FunctionQueue} from "@simplysm/sd-core-common";
import {SdCliIndexFileGenerator} from "../build-tools/SdCliIndexFileGenerator";

export class SdCliTsLibBuilder extends EventEmitter {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", "SdCliTsLibBuilder"]);

  private readonly _pkgConf: ISdCliLibPackageConfig;
  private _builder?: SdTsCompiler;

  public constructor(private readonly _projConf: ISdCliConfig,
                     private readonly _pkgPath: string) {
    super();
    this._pkgConf = this._projConf.packages[path.basename(_pkgPath)] as ISdCliLibPackageConfig;
  }

  public override on(event: "change", listener: () => void): this;
  public override on(event: "complete", listener: (result: ISdCliBuilderResult) => void): this;
  public override on(event: string | symbol, listener: (...args: any[]) => void): this {
    super.on(event, listener);
    return this;
  }

  public async buildAsync(): Promise<ISdCliBuilderResult> {
    this._debug("dist 초기화...");
    await FsUtil.removeAsync(path.resolve(this._pkgPath, "dist"));

    if (!this._pkgConf.noGenIndex) {
      this._debug("GEN index.ts...");
      await SdCliIndexFileGenerator.runAsync(this._pkgPath, this._pkgConf.polyfills);
    }

    const result = await this._runAsync();
    return {
      affectedFilePaths: Array.from(result.affectedFileSet),
      buildResults: result.buildResults
    };
  }

  public async watchAsync(): Promise<void> {
    this.emit("change");

    this._debug("dist 초기화...");
    await FsUtil.removeAsync(path.resolve(this._pkgPath, "dist"));

    if (!this._pkgConf.noGenIndex) {
      this._debug("WATCH GEN index.ts...");
      await SdCliIndexFileGenerator.watchAsync(this._pkgPath, this._pkgConf.polyfills);
    }

    const result = await this._runAsync();
    this.emit("complete", {
      affectedFilePaths: Array.from(result.affectedFileSet),
      buildResults: result.buildResults
    });

    this._debug("WATCH...");
    const fnQ = new FunctionQueue();
    const watcher = SdFsWatcher
      .watch(Array.from(result.watchFileSet))
      .onChange({delay: 100,}, (changeInfos) => {
        this._builder!.markChanges(changeInfos.map((item) => item.path));

        fnQ.runLast(async () => {
          this.emit("change");

          const watchResult = await this._runAsync();
          this.emit("complete", {
            affectedFilePaths: Array.from(watchResult.affectedFileSet),
            buildResults: watchResult.buildResults
          });

          watcher.add(watchResult.watchFileSet);
        });
      });
  }

  private async _runAsync(): Promise<{
    watchFileSet: Set<string>;
    affectedFileSet: Set<string>;
    buildResults: ISdCliPackageBuildResult[];
  }> {
    this._debug(`BUILD && CHECK...`);
    this._builder = this._builder ?? new SdTsCompiler({
      pkgPath: this._pkgPath,
      emit: true,
      emitDts: true,
      globalStyle: true
    });
    const buildResult = await this._builder.buildAsync();

    this._debug("LINT...");
    const lintResults = await SdLinter.lintAsync(Array.from(buildResult.affectedFileSet).filter(item => PathUtil.isChildPath(item, this._pkgPath)), this._builder.program);

    this._debug(`빌드 완료`);
    const localUpdatePaths = Object.keys(this._projConf.localUpdates ?? {})
      .mapMany((key) => FsUtil.glob(path.resolve(this._pkgPath, "../../node_modules", key)));
    const watchFileSet = new Set(Array.from(buildResult.watchFileSet).filter(item =>
      PathUtil.isChildPath(item, path.resolve(this._pkgPath, "../")) ||
      localUpdatePaths.some((lu) => PathUtil.isChildPath(item, lu))
    ));

    return {
      watchFileSet,
      affectedFileSet: buildResult.affectedFileSet,
      buildResults: [...buildResult.results, ...lintResults]
    };
  }

  private _debug(msg: string): void {
    this._logger.debug(`[${path.basename(this._pkgPath)}] ${msg}`);
  }
}
