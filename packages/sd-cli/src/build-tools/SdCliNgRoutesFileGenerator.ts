import path from "path";
import {FsUtil, PathUtil, SdFsWatcher} from "@simplysm/sd-core-node";
import {StringUtil} from "@simplysm/sd-core-common";

export class SdCliNgRoutesFileGenerator {
  public static async watchAsync(pkgPath: string): Promise<void> {
    const routesFilePath = path.resolve(pkgPath, "src/routes.ts");
    let cache = FsUtil.exists(routesFilePath) ? FsUtil.readFile(routesFilePath) : undefined;

    SdFsWatcher
      .watch([path.resolve(pkgPath, "src")])
      .onChange({}, async () => {
        cache = await this.runAsync(pkgPath, cache);
      });

    cache = await this.runAsync(pkgPath, cache);
  }

  public static async runAsync(pkgPath: string, cache?: string): Promise<string> {
    const appDirPath = path.resolve(pkgPath, "src/app");
    const routesFilePath = path.resolve(pkgPath, "src/routes.ts");

    // 내부 파일들 import
    const result: TInfo = new Map();
    const filePaths = await FsUtil.globAsync(path.resolve(appDirPath, "**/*Page.ts"));
    for (const filePath of filePaths.orderBy()) {
      const relModulePath = PathUtil.posix(path.relative(appDirPath, filePath)).slice(0, -3);
      const codes = relModulePath.slice(0, -4).split("/").map(item => StringUtil.toKebabCase(item));

      let cursorItem!: { relModulePath?: string; children: TInfo };
      let cursor = result;

      for (const code of codes) {
        cursorItem = cursor.getOrCreate(code, {children: new Map()});
        cursor = cursorItem.children;
      }

      cursorItem.relModulePath = relModulePath;
    }


    const fn = (currInfo: TInfo, indent: number): string => {
      const indentStr = new Array(indent).fill(" ").join("");

      let cont = "";
      for (const [key, val] of currInfo) {
        cont += indentStr + "{\n";
        cont += indentStr + `  path: "${key}",\n`;
        if (val.relModulePath != null) {
          cont += indentStr + `  loadComponent: () => import("./app/${val.relModulePath}").then((m) => m.${path.basename(val.relModulePath)}),\n`;
          cont += indentStr + `  canDeactivate: [sdCanDeactivateGuard],\n`;
        }
        if (val.children.size > 0) {
          cont += indentStr + `  children: [\n`;
          cont += fn(val.children, indent + 4) + "\n";
          cont += indentStr + `  ]\n`;
        }
        cont += indentStr + "},\n";
      }
      return cont.trimEnd();
    };

    const content = `
import {sdCanDeactivateGuard} from "@simplysm/sd-angular";
import {Routes} from "@angular/router";

export const routes: Routes = [
${fn(result, 2)}
];`.trim();
    if (content.trim() !== cache?.trim()) {
      await FsUtil.writeFileAsync(routesFilePath, content);
    }
    return content;
  }
}

type TInfo = Map<string, {
  relModulePath?: string;
  children: TInfo
}>;