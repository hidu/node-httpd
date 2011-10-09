/**
 * simple http proxy
 * 简单的http代理服务器，同时会把访问过的静态资源保存到本地cache目录中
 * 
 * @author duwei<duv123@gmail.com>
 * @version  20111009 1.0
 */
var   http = require('http');
var   url=require('url');
var   fs=require('fs');
var   path=require('path');
var zlib = require('zlib');


var PORT=5000, //端口
    TIMEOUT=30, //超时时间 30秒
    CACHE_ROOT="/tmp/node-proxy/";

console.log("proxy start width port:"+PORT+" cache dir is:"+CACHE_ROOT);

http.createServer(function(req,res){
	 console.log(req.url);
	 var _url=url.parse(req.url);
	 var _host=req.headers.host.split(":");
	 
	 var option={'host':_host[0],
			      'port':Number(_host[1]||'80'),
			      'path':_url['pathname']+(_url['search']||""),
			      'method':req.method,
			      'headers':req.headers
			      };
	 var needCache=canCache(req.url),
	     cache_file=null;
	 
	 if(needCache){
		 var filename=req.url.replace(/^([\s\S]+\:\/\/)/,'').replace(/(\?[\s\S]*)$/,"");
		 var _ext=path.extname(filename);
		 if(!_ext|| _ext==".")filename+='/index.html';
		 if(path.basename(filename).length>100){
			 filename=path.dirname(filename)+"/"+md5(filename);
		 }
		 cache_file=CACHE_ROOT+filename;
		 console.log(cache_file);
		 if(path.existsSync(cache_file)){
			 res.setHeader('x-cache','node-proxy-cache');
			 fs.readFile(cache_file,function(e,data){
				 res.end(data);
			 });
			 return;
		 }
	 }
	 
	 var clientReq=http.request(option);
	 clientReq.end();
	 
    var timer = null;
	function startTimer() {
		timer = setTimeout(function(){
					console.error(req.url," timeout");
					clientReq.destroy();
					res.statusCode=408;
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
		 res.statueCode=response.statusCode;
		 for(var k in response.headers){
			 res.setHeader(k,response.headers[k]);
		 }
		 
		 var isGzip=response.headers['content-encoding']=='gzip';
		 if(isGzip)needCache=false;
		 response.on('data',function(chunk){
			 clearTimer();
			 if(needCache && !fd){
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
				 fs.close(fd);
				 if(isGzip){
					 console.log('gizp');
					 /*
					  * @todo ungzip
					 var inp = fs.createReadStream(cache_file);
					 var out = fs.createWriteStream(cache_file+".uzip");
					 inp.pipe(zlib.createGzip()).pipe(out);
					 fs.unlinkSync(cache_file);
					 fs.rename(cache_file+".uzip",cache_file);
					 */
				 }
				 fd=null;
			 }
		 });
	 });
	 clientReq.on('error',function(e){
		 console.log(e);
	 });
 }).listen(PORT);
 
 
function directoryCheck(dir){
   if(!path.existsSync(dir)){
	   directoryCheck(path.dirname(dir));
     fs.mkdirSync(dir,0777);
   }
}

function canCache(myurl){
	 var _url=url.parse(myurl);
//	 if((_url['search']||"").length>20)return false;//带有较多参数的
	 
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