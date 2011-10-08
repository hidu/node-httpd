/**
* nodejs http server
* http://www.hongtao3.com
*
* Copyright 2011, duwei
*
* @author duwei<duv123@gmail.com>
*
*/
var util=exports;
util.strlen=function(str){
    var len=0;  
    for(var i=0;i<str.length;i++)if (str.charCodeAt(i)>255){len+=2;}else{len++;}
    return len;  
};

util.extname=function(path){
  var index = (path+"").lastIndexOf(".");
  return index < 0 ? "" : path.substring(index+1);
};

util.trim=function(str){
  return str.replace(/(^\s*)|(\s*$)/,"");
};

util.str2Array=function(str,spilt){
   spilt=spilt||" ";
   return util.trim(str).replace(/\s+/g,spilt==" "?" ":"").split(spilt);
};

util.compileNsp=function(code){
   // var code=require('fs').readFileSync(filename,httpd.config.charset);
    var reg0=/<script\s+run\=\s*[\'\"]?server\s*[\'\"]?\s*>([\s\S]*?)<\/script>/gmi; //<script run=server>echo('hello')</script>
    var reg0_1=/<\?js\s([\s\S]*?)\?>/gm;       //<?js echo('hello')?>
    var reg0_2=/<\?js\s([\s\S]*)/gm;         //<?js echo('hello')
    var reg1=/<\?\=([\s\S]*?)\;?\s*\?>/gm;     // sort tag <?=a?>
    var reg2=/nodejs\?>([\s\S]*?)<\?nodejs/gm; //内部替换 处理服务器端js中间的html代码
    var reg3=/([\s\S]*?)(?=(<\?nodejs))/gm;    //内部替换 处理服务器端js前面的html代码
    var reg4=/nodejs\?>([\s\S]*)/gm;            //内部替换 处理服务器端js后面的html代码

    var matches={};
    var uid="code";
    var i=0;

    var tag_start="<?nodejs ",tag_end=" nodejs?>";
    code=util.trim("<?js ?>"+code);   //添加<?js ?>在最前面以使存html代码也编译通过
    	
    function repl0(reg){
    	code=code.replace(reg,function(all,_code){
    		if(!_code)return "";
    		matches[i]=_code;
    		return tag_start+uid+i+++tag_end;
    	});
    }
    
    repl0(reg0);
    repl0(reg0_1);
    repl0(reg0_2);
    
    code= code.replace(reg1,function(all,_code){
    	matches[i]="\necho("+_code+");";
    	return tag_start+uid+i+++tag_end;
    });
    
    
    function repl(reg,nostart,noend){
       code=code.replace(reg,function(all,html){
            if(html==undefined || !html.length || html.match(/^\s+$/m))return "";
             html=html.replace(/\n/g,"\\n").replace(/\"/g,"\\\"");
             matches[i]="\necho(\""+html+"\");";
           return (nostart?"":tag_start)+uid+i+++(noend?"":tag_end);
        });
    }
    repl(reg2,true,true);

    repl(reg3);
    repl(reg2);
    repl(reg4,true);

    code=code.replace(/^\s+|\s+$/,"");
    
    
    
    var js="";
    code.replace(/code(\d+)/g,function(all,i){
      js+=matches[i]+"\n";
    });
    var compileInfo="//compile at "+new Date().toLocaleString()+"\n";
    js=compileInfo+js.replace(/\n+/gm,"\n");
    return js;
};

util.directoryCheck=function(dir){
   var fs=require('fs');
   var path=require('path');
   if(!path.existsSync(dir)){
     util.directoryCheck(path.dirname(dir));
     fs.mkdirSync(dir,0777);
   }
};

util.md5=function(str){
	var hash = require('crypto').createHash('md5');
	return hash.update(str+"").digest('hex');
};
//获取一个32位随机字符串
util.randomStr=function(){
	 return util.md5(Math.random()+__dirname);
};

util.headerNoCache=function(res){
	 res.setHeader('Expires',"Thu, 19 Nov 1985 08:52:00 GMT");
	 res.setHeader('Cache-Control',"no-store, no-cache, must-revalidate, post-check=0, pre-check=0");
	 res.setHeader('Pragma',"no-cache");
}
