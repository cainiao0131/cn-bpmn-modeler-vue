import axiosStatic, { type AxiosError, type AxiosResponse } from 'axios';
import type { App } from 'vue';

const axios = axiosStatic.create({
  timeout: 300 * 1000,
});

const getErrorMessage = (error: AxiosError<{ errorMessage: string }>) => {
  const response = error.response;
  if (response && response.data) {
    return response.data.errorMessage || '';
  }
  return '';
};

axios.interceptors.response.use(
  (response: AxiosResponse) => {
    // 文件下载
    const contentType = response.headers['content-type'];
    if (contentType && contentType.indexOf('application/vnd.ms-excel') > -1) {
      let fileName = '';
      const descriptions: Array<string> = (response.headers['content-disposition'] || '').split(';');
      for (let i = 0; i < descriptions.length; i++) {
        const keyValue = descriptions[i].split('=');
        if (keyValue.length > 1 && keyValue[0] == 'filename') {
          fileName = keyValue[1];
          break;
        }
      }
      // 下载文件
      return Promise.resolve({
        ext: { fileName },
        data: response.data,
      });
    }
    return Promise.resolve(response.data);
  },
  (error: AxiosError<{ errorMessage: string }>) => {
    const response = error.response;
    const status = response ? Number(response.status) : -1;
    switch (status) {
      case 500:
        return Promise.reject('服务忙，请稍后再试');
      default:
        return Promise.reject(getErrorMessage(error));
    }
  },
);

export { axios };

export default {
  install: (app: App) => {
    app.config.globalProperties.$axios = axios;
  },
};
