export type URIComponentParam = string | number | boolean;

// 根据 RUL 下载文件
export const downloadFile = (href: string, download?: string) => {
  const aElement: HTMLAnchorElement = document.createElement('a');
  aElement.style.display = 'none';
  aElement.href = href;
  if (download) {
    aElement.download = download;
  }
  document.body.appendChild(aElement);
  aElement.click();
  document.body.removeChild(aElement);
};

// 将字符串作为文件下载，type 表示原字符串类型
export const downloadString = (value: URIComponentParam, dataType: string, download?: string) => {
  downloadFile(`data:${dataType};charset=UTF-8,` + encodeURIComponent(value), download);
};

// 复制字符串到剪切板
export const copyText = (textToCopy: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!navigator.clipboard) {
      // 不支持 clipboard API 时
      const inputElement: HTMLInputElement = document.createElement('input');
      inputElement.style.display = 'none';
      inputElement.value = textToCopy;
      document.body.appendChild(inputElement);
      inputElement.select();
      document.execCommand('copy');
      document.body.removeChild(inputElement);
      resolve(textToCopy);
    } else {
      navigator.clipboard
        .writeText(textToCopy)
        .then(() => {
          resolve(textToCopy);
        })
        .catch(error => {
          reject(error);
        });
    }
  });
};

// 复制 DOM 中的内容到剪切板
export const copyTextInDom = (codeContainer: HTMLElement | undefined): Promise<string> => {
  return copyText(codeContainer ? codeContainer.textContent || '' : '');
};

const formatObject = (
  ob: Record<string, unknown>,
  parentIdent = '',
  getValue?: (key: string, value: unknown) => string,
): string => {
  const formats: Array<string> = [];
  const ident = parentIdent + '  ';
  for (const key in ob) {
    const value = ob[key];
    let formatValue: unknown = getValue ? getValue(key, value) : '';
    if (!formatValue) {
      if (Array.isArray(value)) {
        formatValue = formatArray(value, ident);
      } else if (typeof value == 'object') {
        formatValue = formatObject(value as Record<string, unknown>, ident, getValue);
      } else if (typeof value == 'string') {
        formatValue = `'${value}'`;
      } else {
        formatValue = value;
      }
    }
    formats.push(`${ident}${key}: ${formatValue}`);
  }
  if (formats.length < 1) {
    return '{}';
  }
  let formatString = formats.join(',\n');
  formatString += `${parentIdent}\n${parentIdent}}`;
  return `{\n${formatString}`;
};

const formatArray = (
  datas: Array<Record<string, unknown>>,
  parentIdent = '',
  getValue?: (key: string, value: unknown) => string,
): string => {
  const formats: Array<string> = [];
  const ident = parentIdent + '  ';
  datas.forEach(data => {
    formats.push(formatObject(data, ident, getValue));
  });
  return `[${formats.join(', ')}]`;
};

export const format = (ob: unknown, parentIdent = '', getValue?: (key: string, value: unknown) => string): string => {
  if (Array.isArray(ob)) {
    return formatArray(ob, parentIdent, getValue);
  }
  return formatObject(ob as Record<string, unknown>, parentIdent, getValue);
};
