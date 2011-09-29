/**
* nodejs http server
* http://www.hongtao3.com
*
* Copyright 2011, duwei
*
* @author duwei<duv123@gmail.com>
*
*/
var config=exports;
var path=require('path');
config.port=8080;
config.host=null;
config.serverName=null;
config.serverAlias=null;
config.documentRoot=path.dirname(__dirname)+"/webRoot";
config.indexes=true;              //是否列出目录
config.charset='utf-8';           //默认文件编码   
config.directoryIndex=['index.html','index.htm'];
config.compileDir=path.dirname(__dirname)+"/compile";
