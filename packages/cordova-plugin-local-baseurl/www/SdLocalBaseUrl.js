// declare global (window에 바로 SdLocalBaseUrl 사용)
module.exports = {
  setUrl: async (url) => {
    await new Promise((resolve, reject) => {
      // eslint-disable-next-line no-undef
      cordova.exec(() => {
        resolve();
      }, (err) => {
        reject(new Error("CORDOVA: ERROR: " + err));
      }, 'SdLocalBaseUrl', 'setUrl', [url]);
    });
  }
};