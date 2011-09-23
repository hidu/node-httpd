var mime=require("./mime");
var config=require('./config');
var sys=require('sys');
var url = require("url");
var fs = require('fs');
var path=require('path');
var url=require('url');

var http = require("http");

var httpd = exports;

function hand_404(req, res) {
   var msg="the request url "+req.url+" is not on the server";
   hand_error(404,req,res,msg);
}

function hand_error(code,req,res,msg){
 var html="<html><head><title>"+code+" Exception</title></head>";
     html+="<body><h1>"+code+" Exception</h1><p style='color:red;font-size:20px'>"+msg+"</p></body></html>";
  res.writeHead(code, { "Content-Type": "text/html"
                     , "Content-Length": html.length
                     });
  res.end(html);
}

function hand_500(req, res,msg) {
   msg="system error:"+msg||"";
  hand_error(404,req,res,msg);
}


var server = http.createServer(function (req, res) {
  if (req.method === "GET" || req.method === "HEAD") {
    handler_get(req, res);
  }
});

httpd.close = function () { server.close(); };

function extname (path) {
  var index = path.lastIndexOf(".");
  return index < 0 ? "" : path.substring(index+1);
}

function handler_get(req,res){
  var location=url.parse(req.url);
  sys.puts(req.url);
  var filename=config.documentRoot+location.pathname;
  path.exists(filename,function(exists){
    if(exists){
        fs.lstat(filename,function(err,stats){
            if (err) {
                hand_500(req, res,err.message);
              }else{
                if(stats.isDirectory()){
                   list_dir();
                }else if(stats.isFile()){
                   readFile(filename);
                 }
              }  
          });  
    }else{
       hand_404(req,res);
    }
  });
  
  function list_dir(){
      fs.readdir(filename,function(err,files){
            if (err) {
                hand_500(req, res,err.message);
            }else{
             var body="<html><head><title>index of "+location.pathname+"</title></head><body>";
                 body+="<h2>"+location.pathname+"</h2>";;
                 body+="<table style='width:90%'><tr bgcolor='#c8ddf2'><th>Name</th><th>size</th><th>createTime</th></tr>";
                 if(location.pathname!='/'){
                      files.unshift("..");
                   }
                 var p=location.pathname.replace(/\/?$/,"");
                 for(var i=0;i<files.length;i++){
                     body+="<tr><td><a href='"+p+"/"+files[i]+"'>"+files[i]+"</a></td></tr>";
                    }
                  body+="</body></html>";
                 var headers = { "Content-Type": mime.lookupExtension('html')
                                  , "Content-Length": body.length
                                  };
                  res.writeHead(200, headers);
                  res.end(req.method === "HEAD" ? "" : body);   
              }
          });
  }
  
  function readFile(filename){
      fs.readFile(filename, function (err, data) {
          if (err) {
            hand_500(req, res,err.message);
          }else{
            headers = { "Content-Type": mime.lookupExtension(extname(filename))
                      , "Content-Length": data.length
                      };
            res.writeHead(200, headers);
            res.end(req.method === "HEAD" ? "" : data);
          }
        });
  }
}

var argvs={};
var _argvs=process.ARGV.slice(2);
for(var i=0;i<_argvs.length;i++){
  var k=_argvs[i].substring(1,2);
  var v=_argvs[i].substring(2);
  argvs[k]=v;
}
function getArgv(arg){
  return argvs[k]||'';
}

var _config_argvs={'p':'port','h':'host','d':'documentRoot'};

for(var k in _config_argvs){
    var _k=_config_argvs[k];
    var v=getArgv(_k);
    if((v+"").length>0)
    config[_k]=v;	
}

server.listen(Number(config.port), config.host);
sys.puts("Server start at:http://"+(config.host||'127.0.0.1')+":"+config.port);
