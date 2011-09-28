/**
* nodejs http server
* http://www.hongtao3.com
*
* Copyright 2011, duwei
*
* @author duwei<duv123@gmail.com>
*
*/
var mime=require("./mime");
var config=require('./config');
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

/**
 * {uri:function(){}}
 */
httpd.handMap={};
httpd.handAll=function(){};//hand all request;

/**
 * 文件类型句柄
 */
httpd.fileHandler={};
httpd.fileHandlerBind=function(fileType,handler){
  httpd.fileHandler[fileType]=handler;
};

var i=0;
var server = http.createServer(function(req, res){
  _init(req,res);
  console.log(i++);
});

function _init(req,res){
	var location=url.parse(req.url);
	var p=decodeURI(location.pathname);
	
	var filename=config.documentRoot+p;
	
	var _SERVER={    "SERVER_ADDR":httpd.config.host,
				       "SERVER_PORT":httpd.config.port,
				       "SERVER_SOFTWARE":"node-httpd "+httpd.version,
				       "DOCUMENT_ROOT":httpd.config.documentRoot,
				       "SCRIPT_FILENAME":filename,
				       "SCRIPT_NAME":path.relative(httpd.config.documentRoot,filename),
				       "REQUEST_METHOD":req.method,
				       "SERVER_PROTOCOL":"HTTP/1.1",
				       "REQUEST_URI":req.url,
				       "QUERY_STRING":location['query']||"",
				       "REQUEST_TIME":new Date().getTime()
				      };
	 for(var _i in req.headers){
		  _SERVER["HTTP-"+_i.toUpperCase()]=req.headers[_i];  
	 }	
	  
	var _GET={};
	if(_SERVER['QUERY_STRING']){
		_GET=require('querystring').parse(_SERVER['QUERY_STRING']);
		
	}
	
	var sandbox = {   require: require,
			            console: console,
	                   __filename: filename,
	                   res:res,
	                   req:req,
	                   echo:function(s){res.write(s+"");},
	                   $_SERVER:_SERVER,
	                   $_GET:_GET
	                     };
	  
     var runTime={'_SERVER':_SERVER,'_GET':_GET,'sandbox':sandbox,'req':req,'res':res,"config":config};
     
	  res.setHeader('server','node-httpd '+httpd.version);
	  if(false===httpd.handAll.call(runTime)){
	     return;
	  }  
	  if(httpd.handMap[p]){
	    return httpd.handMap[p].call(runTime);
	  }
	  if(req.method === "GET" ||req.method === "HEAD"){
     	    handler_get.call(runTime,req, res);
	  }  
}



function hand_404() {
   var msg="the request url "+decodeURI(this.req.url)+" is not on the server";
   hand_error.call(this,404,msg);
}
function hand_500(msg) {
	msg="system error:"+msg||"";
	hand_error.call(this,404,msg);
}

function hand_error(code,msg){
 var html="<html><head><title>"+code+" Exception</title></head>";
     html+="<body><h1>"+code+" Exception</h1><p style='color:red;font-size:20px'>"+msg+"</p></body></html>";
  this.res.writeHead(code, { "Content-Type": "text/html;charset="+this.config.charset
                     , "Content-Length": myu.strlen(html)
                     });
  this.res.end(html);
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
};



httpd.bind=function(path,handFn){
 httpd.handMap[path]=handFn;
};

httpd.close = function () { server.close(); };

httpd.readFile=function(filename){
   var runTime=this;
   var ext=myu.extname(filename);
   if(httpd.fileHandler[ext]){
     httpd.fileHandler[ext].call(this,filename);
     return;
   }
   
  fs.readFile(filename,config.charset, function(err, data){
      if (err) {
        hand_500.call(runTime,err.message);
      }else{
        headers = { "Content-Type": mime.getByExt(ext)};
        runTime.res.writeHead(200, headers);
        runTime.res.end(runTime.req.method === "HEAD" ? "" : data);
      }
    });
};

httpd.fileHandlerBind('node',function(filename){
   var runTime=this;
  fs.readFile(filename,config.charset, function(err, data){
      if (err) {
        hand_500.call(runTime,err.message);
      }else{
         try{
            require('vm').runInNewContext(data, runTime.sandbox, "myfile.vm");
         }catch(e){console.log(e);}
         runTime.res.end("");
      }
  });
});

//定时检查nsp文件是否修改过
function _check_dir(compileDir,sourceDir){
	fs.readdir(compileDir,function(err,files){
		if (err) {
			console.log('check compile error:'+err.message);
		}else{
			for(var i=0;i<files.length;i++){
				var filename=files[i];
				var cp=compileDir+"/"+filename;
				var stats_c=fs.statSync(cp);
				if(stats_c.isDirectory()){
					_check_dir(cp,sourceDir+"/"+filename);
				}else{
					var sp=sourceDir+"/"+filename.slice(0,-3);
					var stats_s=fs.statSync(sp);
					if(stats_c.mtime.getTime() != stats_s.mtime.getTime()){
						httpd.compileNsp(sp,cp);
					}
				}
			}
		}
	});
}
setInterval(function(){
	try{
    	_check_dir(config.compileDir,config.documentRoot);
	}catch(e){}
},1000);

/**
 * 编译nsp文件
 * @param filename
 * @param compileJsPath
 */
httpd.compileNsp=function(filename,compileJsPath,callBack){
    fs.readFile(filename,config.charset, function(err, data){
        if (err) {
           console.log('read file:'+filename+" fail");
        }else{
            var code=myu.compileNsp(data);
            var stats_cur=fs.lstatSync(filename);
             fs.writeFile(compileJsPath,code,httpd.config.charset,function(){
                  fs.utimes(compileJsPath,stats_cur.atime,stats_cur.mtime);
                  console.log('compile: '+filename+"\t-->\t"+compileJsPath);
                  typeof callBack=="function"  && callBack();
               });
         }
      });
}


httpd.fileHandlerNsp=function(filename){
	 var runTime=this;
    var compileJsPath=httpd.config.compileDir+"/"+runTime._SERVER['SCRIPT_NAME']+".js";
    path.exists(compileJsPath,function(exists){
       if(exists){
    	      runFile(compileJsPath);
       }else{
    	      myu.directoryCheck(path.dirname(compileJsPath));
             httpd.compileNsp(filename,compileJsPath,function(){
        	   runFile(compileJsPath);
           });
       }
    });
    
    function runFile(filePath){
    	fs.readFile(filePath,config.charset, function(err, data){
            if (err){ 
              	hand_500.call(runTime,err.message);
            }else{
            	try{
            	    require('vm').runInNewContext(data, runTime.sandbox, "myfile.vm");
            	  }catch(e){console.log(e);}
            	  runTime.res.end("");
              }
           });
    }
    
};

httpd.fileHandlerBind('nsp',httpd.fileHandlerNsp);


function handler_get(req,res){
  var runTime=this;	
  var location=url.parse(req.url);
  location.pathname=decodeURI(location.pathname);
  var filename=config.documentRoot+location.pathname;
  path.exists(filename,function(exists){
    if(exists){
        fs.lstat(filename,function(err,stats){
            if (err) {
                hand_500.call(runTime,err.message);
              }else{
                if(stats.isFile()){
                      httpd.readFile.call(runTime,filename);
                }else if(stats.isDirectory()){
                     var indexFile=httpd.getDirectoryIndexFile(filename);
                     if(indexFile){
                          httpd.readFile.call(runTime,filename+"/"+indexFile);
                      }else if(httpd.config.indexes){
                          list_dir.call(runTime);
                         }
                     
                 }
              }  
          });  
    }else{
       hand_404.call(runTime);
    }
  });
  
  function list_dir(){
      fs.readdir(filename,function(err,files){
            if (err) {
                hand_500.call(runTime,err.message);
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
console.log("Server start at:http://"+(httpd.config.host||'127.0.0.1')+":"+httpd.config.port);

