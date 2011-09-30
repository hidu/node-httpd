/**
* nodejs http server
* http://www.hongtao3.com
*
* Copyright 2011, duwei
*
* @author duwei<duv123@gmail.com>
*
*/
var fs=require('fs');  
var myu=require('./util');
var tmp=myu.trim(fs.readFileSync(__dirname+'/mime.types','utf-8').replace(/\n+/g,"\n")).split("\n");

var types={};
for(var i=0;i<tmp.length;i++){
   if(!tmp[i])continue;
   var m=myu.str2Array(myu.trim(tmp[i]));
   if(m.length<2)continue;
   for(var j=1;j<m.length;j++){
     types[m[j]]=m[0];
   }
}

var mime=exports;
mime.types=types;
mime.getByExt=function(ext,charset,fallback){
    var m=mime.types[ext.toLowerCase()] || fallback || 'text/html';
    if(!charset)return m;
    var isText=/^text\//;
    if(isText.test(m))return m+";charset="+charset;
    return m;
};

