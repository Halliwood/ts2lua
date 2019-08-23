export interface TranslateOption {
  /**生成lua代码文件后缀名，默认为'.lua' */
  ext?: string, 
  /**lua代码风格，默认适配xlua */
  style?: 'xlua' | null, 
  /**是否在生成的lua代码中，增加ts2lua认为有必要人工处理的提示，默认为true */
  addTip?: boolean,
  /**函数名替换配置json文件路径，默认为lib\\func.json */
  funcReplConfJson?: string, 
  /**正则表达式替换配置txt文件路径，默认为lib\\regex.txt */
  regexReplConfTxt?: string, 
  /**对于没有替换配置的正则表达式，是否尝试简单翻译成lua，默认false。如果为true，则将正则表达式翻译为字符串，将转义符翻译成%。 */
  translateRegex?: boolean,
  /**输出未识别的正则表达式的txt文件路径，默认不输出 */
  traceUnknowRegex?: string
}