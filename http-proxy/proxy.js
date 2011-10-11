/**
 * simple http proxy
 * 简单的http代理服务器，同时会把访问过的静态资源保存到本地cache目录中
 * 
 * @author duwei<duv123@gmail.com>
 * @version  20111009 1.0
 */
var   http = require('http');
var   https = require('https');
var   url=require('url');
var   fs=require('fs');
var   path=require('path');
var zlib = require('zlib');

var PORT=5000, //端口
    TIMEOUT=30, //超时时间 30秒
    CACHE=true;                    //是否缓存
    CACHE_ROOT="/tmp/node-proxy/",  //环境根目录
    SAVE_CACHE=false;               //是否缓存内容到本地文件

console.log("proxy start width port:"+PORT+(SAVE_CACHE?(" cache dir is:"+CACHE_ROOT):""));

var ser=http.createServer(function(req,res){
    res._end=res.end;
    res.end=function(data){res._end(data);console.log(req.method,res.statusCode,req.url);}
	 
	 var _url=url.parse(req.url);
	 var _host=req.headers.host.split(":");
	 var headers=req.headers;
	 delete headers['accept-encoding'];
	 var option={'host':_host[0],
			      'port':Number(_host[1]||'80'),
			      'path':_url['pathname']+(_url['search']||""),
			      'method':req.method,
			      'headers':headers
			      };
	 var needCache=req.method=="GET" && CACHE && canCache(req.url),
	     cache_file=null;
	 
	 res.setHeader('x-cache','node-proxy-cache');
	 
	 if(needCache){
		 if(req.headers['if-none-match'] || req.headers['if-modified-since']){
			 res.statusCode=304;
			 res.end();
			 return;
		 }
		 
		 var filename=req.url.replace(/^([\s\S]+\:\/\/)/,'').replace(/(\?[\s\S]*)$/,"");
		 var _ext=path.extname(filename);
		 if(!_ext|| _ext==".")filename+='/index.html';
		 if(path.basename(filename).length>100){
			 filename=path.dirname(filename)+"/"+md5(filename);
		 }
		 cache_file=CACHE_ROOT+filename;

		 if(path.existsSync(cache_file)){
			 fs.readFile(cache_file,function(e,data){
				 res.end(data);
			 });
			 return;
		 }
	 }
	 
	 var clientReq=http.request(option);
	 req.on('data',function(c){
		 clientReq.write(c);
	 });
	 req.on('end',function(){
		 clientReq.end();
	 });
	 
    var timer = null;
	function startTimer() {
		timer = setTimeout(function(){
					console.error(req.url," timeout");
					clientReq.abort();
					res.statusCode=504;
					res.end();
				}, TIMEOUT * 1000);
	}
	function clearTimer() {
		if(timer){
			clearTimeout(timer);
			timer = null;
		}
	}
	startTimer();
	 
	 clientReq.on('response', function (response) {
		 var fd=null;
		 if(needCache){
			 needCache=checkCanCacheByHeader(response.headers);
		 }
		 res.statusCode=response.statusCode;
		 
		 for(var k in response.headers){
			 res.setHeader(k,response.headers[k]);
		 }
		 response.on('data',function(chunk){
			 clearTimer();
			 if(SAVE_CACHE && needCache && !fd){
				 directoryCheck(path.dirname(cache_file));
				 fd=fs.openSync(cache_file,'w+');
			 }
			 res.write(chunk);
			if(fd){
				fs.writeSync(fd,chunk,0,chunk.length);
			 }
		 });
		 response.on('end',function(){
			 clearTimer();
			 res.end();
			 if(fd){
				 fs.closeSync(fd);
				 fd=null;
			 }
		 });
	 });
	 clientReq.on('error',function(e){
//		 console.log(e);
	 });
 });
ser.listen(PORT);
 
 
function directoryCheck(dir){
   if(!path.existsSync(dir)){
	   directoryCheck(path.dirname(dir));
     fs.mkdirSync(dir,0777);
   }
}

function canCache(myurl){
	 var _url=url.parse(myurl);
	 var ext=path.extname(_url['pathname']).replace(/^\./,"").toLowerCase();
    var exts="js,css,xml,gif,jpg,jpeg,png,swf,flv,";
    return  ext && !!exts.match(ext+",");
}

//检查是否时动态输出的内容
function checkCanCacheByHeader(header){
	var nowTime=0;
	if(header['date']){
		nowTime=Date.parse(header['date']);
	}else{
		nowTime=new Date().getTime();
	}
	if(header['last-modified']){
		return Date.parse(header['last-modified'])<nowTime;
	}
	
	if(header['expires'] && Date.parse(header['expires'])<nowTime){
		return false;
	}
	return true;
}

function md5(str){
	var hash = require('crypto').createHash('md5');
	return hash.update(str+"").digest('hex');
}