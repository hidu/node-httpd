var config=exports;
var path=require('path');
config.port=8080;
config.host=null;
config.documentRoot=path.dirname(__dirname)+"/webRoot";
config.indexes=true;              //是否列出目录
config.charset='utf-8';           //默认文件编码   
config.directoryIndex="index.html index.htm";