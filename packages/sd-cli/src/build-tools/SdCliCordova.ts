import {INpmConfig, ISdCliClientBuilderCordovaConfig} from "../commons";
import * as path from "path";
import {FsUtil, Logger, SdProcess} from "@simplysm/sd-core-node";
import xml2js from "xml2js";

const BIN_PATH = path.resolve(process.cwd(), "node_modules/.bin/cordova.cmd");

export class SdCliCordova {
  protected readonly _logger = Logger.get(["simplysm", "sd-cli", "SdCliCordova"]);

  private readonly _platforms: string[];
  private readonly _npmConfig: INpmConfig;

  public constructor(private readonly _opt: {
    pkgPath: string;
    config: ISdCliClientBuilderCordovaConfig;
    cordovaPath: string;
  }) {
    this._platforms = Object.keys(this._opt.config.platform ?? {browser: {}});
    this._npmConfig = FsUtil.readJson(path.resolve(this._opt.pkgPath, "package.json"));
    // this._logger = Logger.get(["simplysm", "sd-cli", this.constructor.name, this._npmConfig.name]);
  }

  private async _execAsync(cmd: string, cwd: string): Promise<void> {
    this._logger.debug(cmd);
    const msg = await SdProcess.spawnAsync(cmd, {cwd});
    this._logger.debug(msg);
  }

  public async initializeAsync(): Promise<void> {
    if (FsUtil.exists(this._opt.cordovaPath)) {
      this._logger.log("이미 생성되어있는 '.cordova'를 사용합니다.");
    }
    else {
      await this._execAsync(`${BIN_PATH} telemetry on`, this._opt.pkgPath);

      // 프로젝트 생성
      await this._execAsync(`${BIN_PATH} create "${this._opt.cordovaPath}" "${this._opt.config.appId}" "${this._opt.config.appName}"`, process.cwd());
    }

    // platforms 폴더 혹시 없으면 생성
    await FsUtil.mkdirsAsync(path.resolve(this._opt.cordovaPath, "platforms"));

    // www 폴더 혹시 없으면 생성
    await FsUtil.mkdirsAsync(path.resolve(this._opt.cordovaPath, "www"));

    // 미설치 빌드 플랫폼 신규 생성
    const alreadyPlatforms = await FsUtil.readdirAsync(path.resolve(this._opt.cordovaPath, "platforms"));
    for (const platform of this._platforms) {
      if (!alreadyPlatforms.includes(platform)) {
        await this._execAsync(`${BIN_PATH} platform add ${platform}`, this._opt.cordovaPath);
      }
    }

    // 설치 미빌드 플랫폼 삭제
    for (const alreadyPlatform of alreadyPlatforms) {
      if (!this._platforms.includes(alreadyPlatform)) {
        await this._execAsync(`${BIN_PATH} platform remove ${alreadyPlatform}`, this._opt.cordovaPath);
      }
    }

    // 설치된 미사용 플러그인 삭제
    const pluginsFetch = FsUtil.exists(path.resolve(this._opt.cordovaPath, "plugins/fetch.json"))
      ? await FsUtil.readJsonAsync(path.resolve(this._opt.cordovaPath, "plugins/fetch.json"))
      : undefined;
    const alreadyPluginIds = pluginsFetch != undefined
      ? Object.keys(pluginsFetch)
      // Object.values(pluginsFetch).map((item: any) => item.source.id ?? item.source.url ?? item.source.path)
      : [];
    const usePlugins = ["cordova-plugin-ionic-webview", ...this._opt.config.plugins ?? []].distinct();

    for (const alreadyPluginId of alreadyPluginIds) {
      let hasPlugin = false;
      for (const usePlugin of usePlugins) {
        if (alreadyPluginId === usePlugin) {
          hasPlugin = true;
          break;
        }
        /*if (
          (usePlugin.includes("@") && alreadyPluginId === usePlugin) ||
          (!usePlugin.includes("@") && alreadyPluginId.replace(/@.*$/, "") === usePlugin)
        ) {
          hasPlugin = true;
          break;
        }*/
      }

      if (!hasPlugin) {
        await this._execAsync(`${BIN_PATH} plugin remove ${alreadyPluginId}`, this._opt.cordovaPath);
      }
    }

    // 미설치 플러그인들 설치
    for (const usePlugin of usePlugins) {
      if (
        (usePlugin.includes("@") && !alreadyPluginIds.includes(usePlugin)) ||
        (!usePlugin.includes("@") && !alreadyPluginIds.map((alreadyPluginId) => alreadyPluginId.replace(/@.*$/, "")).includes(usePlugin))
      ) {
        await this._execAsync(`${BIN_PATH} plugin add ${usePlugin}`, this._opt.cordovaPath);
      }
    }

    // ANDROID SIGN 파일 복사
    if (this._opt.config.platform?.android?.sign) {
      await FsUtil.copyAsync(
        path.resolve(this._opt.pkgPath, "src", this._opt.config.platform.android.sign.keystore),
        path.resolve(this._opt.cordovaPath, "android.keystore")
      );
    }
    else {
      await FsUtil.removeAsync(path.resolve(this._opt.cordovaPath, "android.keystore"));
      // SIGN을 안쓸경우 아래 파일이 생성되어 있으면 오류남
      await FsUtil.removeAsync(path.resolve(this._opt.cordovaPath, "platforms/android/release-signing.properties"));
    }

    // 빌드 옵션 파일 생성
    await FsUtil.writeJsonAsync(
      path.resolve(this._opt.cordovaPath, "build.json"),
      {
        ...this._opt.config.platform?.android ? {
          android: {
            release: {
              packageType: this._opt.config.platform.android.bundle ? "bundle" : "apk",
              ...this._opt.config.platform.android.sign ? {
                keystore: path.resolve(this._opt.cordovaPath, "android.keystore"),
                storePassword: this._opt.config.platform.android.sign.storePassword,
                alias: this._opt.config.platform.android.sign.alias,
                password: this._opt.config.platform.android.sign.password,
                keystoreType: this._opt.config.platform.android.sign.keystoreType
              } : {}
            }
          }
        } : {}
      }
    );

    // ICON 파일 복사
    if (this._opt.config.icon !== undefined) {
      await FsUtil.copyAsync(path.resolve(this._opt.pkgPath, "src", this._opt.config.icon), path.resolve(this._opt.cordovaPath, "res/icon", path.basename(this._opt.config.icon)));
    }
    else {
      await FsUtil.removeAsync(path.resolve(this._opt.cordovaPath, "res/icon"));
    }

    // CONFIG: 초기값 백업
    const configFilePath = path.resolve(this._opt.cordovaPath, "config.xml");
    const configBackFilePath = path.resolve(this._opt.cordovaPath, "config.xml.bak");
    if (!FsUtil.exists(configBackFilePath)) {
      await FsUtil.copyAsync(configFilePath, configBackFilePath);
    }

    // CONFIG: 초기값 읽기
    const configFileContent = await FsUtil.readFileAsync(configBackFilePath);
    const configXml = await xml2js.parseStringPromise(configFileContent);


    // CONFIG: 버전 설정
    configXml.widget.$.version = this._npmConfig.version;

    // CONFIG: ICON 설정
    if (this._opt.config.icon !== undefined) {
      configXml["widget"]["icon"] = [{"$": {"src": "res/icon/" + path.basename(this._opt.config.icon)}}];
    }

    // CONFIG: 접근허용 세팅
    configXml["widget"]["access"] = [{"$": {"origin": "*"}}];
    configXml["widget"]["allow-navigation"] = [{"$": {"href": "*"}}];
    configXml["widget"]["allow-intent"] = [{"$": {"href": "*"}}];
    configXml["widget"]["preference"] = [{"$": {"name": "MixedContentMode", "value": "0"}}];

    // CONFIG: ANDROID usesCleartextTraffic 설정
    if (this._opt.config.platform?.android) {
      configXml.widget.$["xmlns:android"] = "http://schemas.android.com/apk/res/android";

      configXml["widget"]["platform"] = configXml["widget"]["platform"] ?? [];
      configXml["widget"]["platform"].push({
        "$": {
          "name": "android"
        },
        "edit-config": [{
          "$": {
            "file": "app/src/main/AndroidManifest.xml",
            "mode": "merge",
            "target": "/manifest/application"
          },
          "application": [{
            "$": {
              "android:usesCleartextTraffic": "true"
            }
          }]
        }]
      });
    }

    // CONFIG: 파일 새로 쓰기
    const configResultContent = new xml2js.Builder().buildObject(configXml);
    await FsUtil.writeFileAsync(configFilePath, configResultContent);

    // 각 플랫폼 www 준비
    await this._execAsync(`${BIN_PATH} prepare`, this._opt.cordovaPath);
  }

  public async buildAsync(outPath: string): Promise<void> {
    // 실행
    const buildType = this._opt.config.debug ? "debug" : "release";
    for (const platform of this._platforms) {
      await this._execAsync(`${BIN_PATH} build ${platform} --${buildType}`, this._opt.cordovaPath);
    }

    // 결과물 복사: ANDROID
    if (this._opt.config.platform?.android) {
      const targetOutPath = path.resolve(outPath, "android");
      const apkFileName = this._opt.config.platform.android.sign ? `app-${buildType}.apk` : `app-${buildType}-unsigned.apk`;
      const latestDistApkFileName = path.basename(`${this._opt.config.appName}${this._opt.config.platform.android.sign ? "" : "-unsigned"}-latest.apk`);
      await FsUtil.mkdirsAsync(targetOutPath);
      await FsUtil.copyAsync(
        path.resolve(this._opt.cordovaPath, "platforms/android/app/build/outputs/apk", buildType, apkFileName),
        path.resolve(targetOutPath, latestDistApkFileName)
      );
      // 자동업데이트를 위한 파일 쓰기
      await FsUtil.copyAsync(
        path.resolve(this._opt.cordovaPath, "platforms/android/app/build/outputs/apk", buildType, apkFileName),
        path.resolve(path.resolve(targetOutPath, "updates"), this._npmConfig.version + ".apk")
      );
    }
  }

  public static async runWebviewOnDeviceAsync(opt: {
    platform: string,
    pkgName: string,
    url?: string
  }): Promise<void> {
    const cordovaPath = path.resolve(process.cwd(), `packages/${opt.pkgName}/.cordova/`);

    if (opt.url !== undefined) {
      await FsUtil.removeAsync(path.resolve(cordovaPath, "www"));
      await FsUtil.mkdirsAsync(path.resolve(cordovaPath, "www"));
      await FsUtil.writeFileAsync(path.resolve(cordovaPath, "www/index.html"), `'${opt.url}'로 이동중... <script>setTimeout(function () {window.location.href = "${opt.url.replace(/\/$/, "")}/${opt.pkgName}/cordova/"}, 3000);</script>`.trim());
    }
    /*else {
      await FsUtil.removeAsync(path.resolve(cordovaPath, "www"));
      await FsUtil.copyAsync(path.resolve(process.cwd(), `packages/${opt.pkgName}/dist/cordova`), path.resolve(cordovaPath, "www"));
    }*/

    const binPath = path.resolve(process.cwd(), "node_modules/.bin/cordova.cmd");
    await SdProcess.spawnAsync(`${binPath} run ${opt.platform} --device`, {cwd: cordovaPath}, true);
  }
}
