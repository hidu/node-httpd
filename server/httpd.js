var mime=require("./mime");
var config=require('./config');
var sys=require('sys');
var url = require("url");
var fs = require('fs');
var path=require('path');
var url=require('url');
var myu=require('./util');

var http = require("http");

var httpd = exports;
httpd.version='1.0';
httpd.config=config;

/*
*get the param
*example:
*   node httpd.js -p80
* set the port as 80,all the param support see "_config_argvs"
*
*/
httpd.argvs=(function(){
    var argvs={};
    var _argvs=process.ARGV.slice(2);
    for(var i=0;i<_argvs.length;i++){
      var k=_argvs[i].substring(1,2);
      argvs[k]=_argvs[i].substring(2);
    }
    return argvs;
})();
httpd.getArg=function(arg){return httpd.argvs[arg]||'';}

var _config_argvs={'p':'port','h':'host','d':'documentRoot','c':'charset'};
for(var k in _config_argvs){
    var _k=_config_argvs[k];
    var v=httpd.getArg(_k);
    if((v+"").length>0)
    httpd.config[_k]=v;	
}

httpd.handMap={};
httpd.handAll=function(){};//hand all request;

var server = http.createServer(function(req, res){
  httpd.req=req;
  httpd.res=res;
  var location=url.parse(req.url);
  var path=decodeURI(location.pathname);
  res.setHeader('server','node-httpd '+httpd.version);
  if(false===httpd.handAll.call(httpd)){
     return;
  }  
  
  if(httpd.handMap[path]){
    return httpd.handMap[path].call(httpd);
  }
  if (req.method === "GET" || req.method === "HEAD") {
    handler_get(req, res);
  }
});

function hand_404() {
   var msg="the request url "+decodeURI(httpd.req.url)+" is not on the server";
   hand_error(404,msg);
}

function hand_error(code,msg){
 var html="<html><head><title>"+code+" Exception</title></head>";
     html+="<body><h1>"+code+" Exception</h1><p style='color:red;font-size:20px'>"+msg+"</p></body></html>";
  httpd.res.writeHead(code, { "Content-Type": "text/html;charset="+httpd.config.charset
                     , "Content-Length": myu.strlen(html)
                     });
  httpd.res.end(html);
}

httpd.config._directoryIndex=myu.str2Array(httpd.config.directoryIndex);

httpd.getDirectoryIndexFile=function(dir){
  var indexes=httpd.config._directoryIndex;
  for(var i=0;i<indexes.length;i++){
      var f=dir+"/"+indexes[i];
      if(path.existsSync(f)){
         return indexes[i];
       }
  }
  return null;
}

function hand_500(msg) {
   msg="system error:"+msg||"";
  hand_error(404,msg);
}

httpd.bind=function(path,handFn){
 httpd.handMap[path]=handFn;
};

httpd.close = function () { server.close(); };

httpd.readFile=function(filename){
  fs.readFile(filename,config.charset, function(err, data){
      if (err) {
        hand_500(err.message);
      }else{
        headers = { "Content-Type": mime.getByExt(myu.extname(filename))
                  };
        httpd.res.writeHead(200, headers);
        httpd.res.end(httpd.req.method === "HEAD" ? "" : data);
      }
    });
};


function handler_get(req,res){
  var location=url.parse(req.url);
  location.pathname=decodeURI(location.pathname);
  var filename=config.documentRoot+location.pathname;
  path.exists(filename,function(exists){
    if(exists){
        fs.lstat(filename,function(err,stats){
            if (err) {
                hand_500(err.message);
              }else{
                if(stats.isFile()){
                      httpd.readFile(filename);
                }else if(stats.isDirectory()){
                     var indexFile=httpd.getDirectoryIndexFile(filename);
                     if(indexFile){
                          httpd.readFile(filename+"/"+indexFile);
                      }else if(httpd.config.indexes){
                          list_dir();
                         }
                     
                 }
              }  
          });  
    }else{
       hand_404();
    }
  });
  
  function list_dir(){
      fs.readdir(filename,function(err,files){
            if (err) {
                hand_500(err.message);
            }else{
                 files.sort();
                 if(location.pathname!='/'){
                      files.unshift("..");
                   }
             var p=location.pathname.replace(/\/?$/,"");
                 
             var body="<html><head><meta content='text/html; charset="+httpd.config.charset+"' http-equiv='Content-Type'>"
                       +"<title>index of "+location.pathname+"</title></head><body>"
                       +"<h2>"+location.pathname+"</h2>"
                       +"<table style='width:90%'><tr bgcolor='#c8ddf2'><th>Name</th><th>size</th><th>createTime</th></tr>\n";
                 for(var i=0;i<files.length;i++){
                     body+="<tr><td><a href='"+encodeURI(p+"/"+files[i])+"'>"+files[i]+"</a></td><td></td><td></td></tr>\n";
                    }
                  body+="</body></html>";
                 var headers = {"Content-Type": 'text/html;charset='+httpd.config.charset};
                  res.writeHead(200, headers);
                  res.end(req.method === "HEAD" ? "" : body);   
              }
          });
  }
  
};





server.listen(Number(httpd.config.port), httpd.config.host);
sys.puts("Server start at:http://"+(httpd.config.host||'127.0.0.1')+":"+httpd.config.port);

