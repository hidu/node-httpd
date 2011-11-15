/**
* nodejs http server
* http://www.hongtao3.com
*
* Copyright 2011, duwei
*
* @author duwei<duv123@gmail.com>
*
*/
var mime=require("./mime"),
    config=require('./conf/default'),
    url = require("url"),
    fs = require('fs'),
    path=require('path'),
    url=require('url'),
    myu=require('./util'),
    qs=require('querystring'),
    vm=require('vm'),
    http = require("http"),
    cookie=require("./cookie");

var httpd = exports;
httpd.version='1.0';
var vhosts=require('./conf/vhosts');


/**
 * {uri:function(){}}
 */
httpd.handMap={};
httpd.filterAll=function(){};//hand all request;

/**
 * 文件类型句柄
 */
httpd.fileHandler={};
httpd.fileHandlerBind=function(fileType,handler){
  httpd.fileHandler[fileType]=handler;
};

/**
 * 运行时包含文件
 * @param filename
 */
function includeFile(filename,params){
	var runTime=this;
	var sandbox=runTime.sandbox;
	if(params){
		for(var n in params){
			sandbox[n]=params[n];
		}
	}
	
	this.__filename=filename;
	this.__dirname=path.dirname(filename);
	var ext=myu.extname(filename);
	if(ext=='nsp'){
		 var compileJsPath=httpd.getCompileJsPath.call(runTime,filename);
		 if(path.existsSync(compileJsPath)){
			 runJsFileSync(compileJsPath);
		 }else{
	         var code=httpd.compileNspSync.call(runTime,filename);
			  try{
		        vm.runInNewContext(code, sandbox, runTime._SERVER.SCRIPT_FILENAME);
		     }catch(e){console.log(e);}
		 }
	}else if(ext=='node'){
		 runJsFileSync(filename);
	}else{
		var code=fs.readFileSync(filename,runTime.config.charset);
		sandbox.echo(code);
	}
	
	function runJsFileSync(file){
		var code=fs.readFileSync(file,runTime.config.charset);
		try{
	        vm.runInNewContext(code, sandbox, runTime._SERVER.SCRIPT_FILENAME);
	     }catch(e){console.log(e);}
	}
};

httpd.getScriptName=function(documentRoot,filename){
	return path.relative(documentRoot,filename);
};


function requestListener(req,res){
	var config=vhosts.getConfig(req.headers.host);
	var location=url.parse(req.url);
	var p=decodeURI(location.pathname);
	var filename=config.documentRoot+p;
	var _host=req.headers.host.split(":");
	var hostname=_host[0],port=_host[1];
	
	res._end=res.end;
    res.end=function(data){
    	res._end(data);
    	console.log(req.client.remoteAddress+" - - ["+new Date().toLocaleString()+"] \""+
    			     req.method+" "+req.url+" "+"HTTP/"+req.httpVersion+"\" "+ res.statusCode +
    			     " \"http://"+req.headers.host+"\" \""+
    			     req.headers['user-agent']+"\"");
    	};
	

	var _SERVER={    "SERVER_ADDR":hostname,
				       "SERVER_PORT":config.port,
				       "SERVER_SOFTWARE":"node-httpd "+httpd.version,
				       "DOCUMENT_ROOT":config.documentRoot,
				       "SCRIPT_FILENAME":filename,
				       "SCRIPT_NAME":httpd.getScriptName(config.documentRoot,filename),
				       "REQUEST_METHOD":req.method,
				       "SERVER_PROTOCOL":"HTTP/"+req.httpVersion,
				       "REQUEST_URI":req.url,
				       "REMOTE_ADDR":req.client.remoteAddress,
				       "REMOTE_PORT":req.client.remotePort,
				       "QUERY_STRING":location['query']||"",
				       "REQUEST_TIME":new Date().getTime()
				      };
	 for(var _i in req.headers){
		  _SERVER["HTTP-"+_i.toUpperCase()]=req.headers[_i];  
	 }	
	var _GET={};
	if(_SERVER['QUERY_STRING']){
		_GET=qs.parse(_SERVER['QUERY_STRING']);
	}
	req.$_GET=_GET;
	var _COOKIE=cookie.getAllCookie(req);

	var runTime;
	var sandbox = {   require: require,
			            console: console,
	                   __filename: filename,
	                   __dirname: path.dirname(filename),
	                   res:res,
	                   req:req,
	                   echo:function(s){res.write(s+"");},
	                   include:function(filename,params){includeFile.call(runTime,filename,params);}, 
	                   $_SERVER:_SERVER,
	                   $_GET:_GET,
	                   $_POST:{},
	                   $_COOKIE:_COOKIE,
	                   setcookie:function(key,value,expire,properties){cookie.setcookie(res,key,value,expire,properties);}
	                     };
	
	if(req.method === 'POST'){
		var _data='';
	    req.on('data', function(chunk){_data += chunk;});
	    req.on('end', function() {sandbox.$_POST=req.$_POST= qs.parse(_data);});
	}
    runTime={'_SERVER':_SERVER,'_GET':_GET,'sandbox':sandbox,
    		   'req':req,'res':res,"config":config,"location":location,
    		   "filename":filename,"basename":path.basename(filename)};
    
    if(config.aclFunction.call(runTime)===false){
    	res.end();
    	return;
    }
    
	  res.setHeader('server','node-httpd '+httpd.version);
	  res.setHeader('Date',new Date().toUTCString());
	  res.setHeader("Content-Type", mime.getByExt(myu.extname(filename),config.charset));
	  res.statusCode=200;
	  if(false===httpd.filterAll.call(runTime)){
	     return;
	  }  
	  if(httpd.handMap[p]){
	    return httpd.handMap[p].call(runTime);
	  }
	  
     handler_default.call(runTime,req, res);
}





function hand_404() {
   var msg="the request url "+decodeURI(this.req.url)+" is not on the server";
   hand_error.call(this,404,msg);
}
function hand_500(msg) {
	msg="system error:"+msg||"";
	hand_error.call(this,500,msg);
}

function hand_error(code,msg){
 var html="<html><head><title>"+code+" Exception</title></head>";
     html+="<body><h1>"+code+" Exception</h1><p style='color:red;font-size:20px'>"+msg+"</p></body></html>";
  this.res.statusCode=code;
  this.res.end(html);
}


httpd.getDirectoryIndexFile=function(dir){
  var indexes=this.config.directoryIndex;
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

//httpd.close = function () { server.close(); };

httpd.readFile=function(filename){
   var runTime=this;
   var ext=myu.extname(filename);
   if(httpd.fileHandler[ext]){
     httpd.fileHandler[ext].call(this,filename);
     return;
   }
   
  fs.readFile(filename,runTime.config.charset, function(err, data){
      if (err) {
        hand_500.call(runTime,err.message);
      }else{
    	 var _md5 =myu.md5(data);
    	 runTime.res.setHeader('Etag',_md5);
    	 var _inm=runTime.req.headers['if-none-match']||"";
    	 if(_inm && _inm==_md5){
    		 runTime.res.statusCode=304;
    		 runTime.res.end();
    		 return;
    	 }
        runTime.res.end(runTime.req.method === "HEAD" ? "" : data);
      }
    });
};



httpd.fileHandlerBind('node',function(filename){
   var runTime=this;
   myu.headerNoCache(runTime.res);
  fs.readFile(filename,runTime.config.charset, function(err, data){
      if (err) {
        hand_500.call(runTime,err.message);
      }else{
         try{
            vm.runInNewContext(data, runTime.sandbox, filename);
         }catch(e){console.log(e);}
         runTime.res.end();
      }
  });
});


/**
 * 编译nsp文件
 * @param filename
 * @param compileJsPath
 */
httpd.compileNsp=function(filename,compileJsPath,charset,callBack){
    fs.readFile(filename,charset, function(err, data){
        if (err) {
           console.log('read file:'+filename+" fail");
        }else{
            var code=myu.compileNsp(data);
            var stats_cur=fs.lstatSync(filename);
             fs.writeFile(compileJsPath,code,charset,function(){
                  fs.utimes(compileJsPath,stats_cur.atime,stats_cur.mtime);
                  console.log('compile: '+filename+"\t-->\t"+compileJsPath);
                  typeof callBack=="function"  && callBack();
               });
         }
      });
};
/**
 * 返回nsp文件编译后文件的路径
 * @param fileName
 * @returns {String}
 */
httpd.getCompileJsPath=function(fileName){
	return this.config.compileDir+"/"+httpd.getScriptName(this.config.documentRoot,fileName)+".js";
};

httpd.compileNspSync=function(filename){
	var compileJsPath=httpd.getCompileJsPath.call(this,filename);
	var data=fs.readFileSync(filename,this.config.charset);
	var code=myu.compileNsp(data);
   var stats_cur=fs.lstatSync(filename);
   fs.writeFile(compileJsPath,code,this.config.charset,function(){
           fs.utimes(compileJsPath,stats_cur.atime,stats_cur.mtime);
           console.log('compile: '+filename+"\t-->\t"+compileJsPath);
     });
   return code;
};

httpd.fileHandlerNsp=function(filename){
	 var runTime=this;
	 myu.headerNoCache(runTime.res);
    var compileJsPath=httpd.getCompileJsPath.call(this,filename);
    path.exists(compileJsPath,function(exists){
       if(exists){
    	      runFile(compileJsPath);
       }else{
    	      myu.directoryCheck(path.dirname(compileJsPath));
             httpd.compileNsp(filename,compileJsPath,runTime.config.charset,function(){
        	     runFile(compileJsPath);
               });
       }
    });
    
    function runFile(filePath){
    	fs.readFile(filePath,runTime.config.charset, function(err, data){
            if (err){ 
              	hand_500.call(runTime,err.message);
            }else{
               	runCode(data);
              }
           });
    }
    
    function runCode(code){
    	try{
    	    require('vm').runInNewContext(code, runTime.sandbox, filename);
    	  }catch(e){console.log(e);}
    	  runTime.res.end();
     }
};

httpd.fileHandlerBind('nsp',httpd.fileHandlerNsp);


function handler_default(req,res){
  var runTime=this;	
  var filename=runTime._SERVER.SCRIPT_FILENAME;
  function fslstat(filename){
	  fs.lstat(filename,function(err,stats){
	      if(err){
	    	  hand_404.call(runTime);
	      }else{
	    	 if(stats.isFile()){
	              httpd.readFile.call(runTime,filename);return;
	        }else if(stats.isDirectory()){
	             var indexFile=httpd.getDirectoryIndexFile.call(runTime,filename);
	             if(indexFile){
	                  httpd.readFile.call(runTime,filename+"/"+indexFile);
	              }else if(runTime.config.indexes){
	                  list_dir();
	                 }
	             
	         }else if(stats.isSymbolicLink){
	    		 fs.readlink(filename,function(err1, linkString){
	    			 if(err1){
	    				 console.log(err1.message);
	    			 }else{
	    				fslstat(linkString); 
	    			 }
	    		 });
	    	 }
	      }  
	   });  
  };
  fslstat(filename); 
  
  function list_dir(){
	  location=runTime.location;
      fs.readdir(filename,function(err,files){
            if (err) {
                hand_500.call(runTime,err.message);
            }else{
                 files.sort();
                 if(location.pathname!='/'){
                      files.unshift("..");
                   }
             var p=location.pathname.replace(/\/?$/,"");
                 
             var body="<html><head><meta content='text/html; charset="+runTime.config.charset+"' http-equiv='Content-Type'>"
                       +"<title>index of "+location.pathname+"</title></head><body style='margin:10px 20px'>"
                       +"<h1>index of "+location.pathname+"</h1><hr/>";
	             if(location.pathname!="/"){
	            	 body+="<div><a href='"+encodeURI(p+"/..")+"'>..</a></div>";
	               }
                 for(var i=0;i<files.length;i++){
                	 if(!files[i].match(/^\./)){
                     body+="<div><a href='"+encodeURI(p+"/"+files[i])+"'>"+files[i]+"</a></div>";
                	 }
                    }
                  body+="</body></html>";
                  res.end(req.method === "HEAD" ? "" : body);   
              }
          });
  }
  
};
for(var port in vhosts.ports){
	var server = http.createServer(requestListener);
	server.listen(Number(port));
	console.log("Server start at:http://127.0.0.1:"+port);
}

//定时检查nsp文件是否修改过
function _check_dir(compileDir,sourceDir){
//	console.log(compileDir+"-->"+sourceDir);
	if(!path.existsSync(compileDir))return;
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
						httpd.compileNsp(sp,cp,'utf-8');
					}
				}
			}
		}
	});
}
if(config.autoCompileCheck){
	var uniqueDocuments={};
	for(var i=0;i<vhosts.items.length;i++){
		var item=vhosts.items[i];
		var k=myu.md5(item['compileDir']);
		uniqueDocuments[k]=[item['compileDir'],item['documentRoot']];
	}
	for(var k in uniqueDocuments){
		(function(sc){
			console.log('autoCompile: '+sc[1]+"--->"+sc[0]);
			setInterval(function(){
				try{
			    	_check_dir(sc[0],sc[1]);
				}catch(e){}
			},1000);
		})(uniqueDocuments[k]);
	}
}
