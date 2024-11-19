export const translateBpmn = (locale: Record<string, string>, key?: string): string => {
  if (!key) {
    return '';
  }
  return locale[key];
};

export const cnTranslator = (
  origin: string,
  replacements: Record<string, string>,
  locale: Record<string, string>,
): string => {
  const temp = translateBpmn(locale, origin);
  if (!temp) {
    return origin;
  }
  replacements = replacements || {};
  // 对由 {} 表示的占位符中的内容进行翻译，用于翻译动态内容
  return temp.replace(/{([^}]+)}/g, function (oldValue: string, key: string) {
    let replacement = replacements[key];
    if (replacement) {
      replacement = translateBpmn(locale, replacement);
    }
    return replacement || oldValue;
  });
};
