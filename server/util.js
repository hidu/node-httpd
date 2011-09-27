var util=exports;
util.strlen=function(str){
    var len=0;  
    for(var i=0;i<str.length;i++)if (str.charCodeAt(i)>255){len+=2;}else{len++;}
    return len;  
};

util.extname=function(path){
  var index = path.lastIndexOf(".");
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
    var reg0=/<script\s+run\=\s*[\'\"]?server\s*[\'\"]?\s*>([\s\S]*?)<\/script>/gmi;
    var reg1=/<\?\=(\w+)\;?\s*\?>/gmi;
    var reg2=/nodejs\?>([\s\S]*?)<\?nodejs/gmi;
    var reg3=/([\s\S]*?)(?=(<\?nodejs))/gmi;
    var reg4=/nodejs\?>([\s\S]*)/gmi;

    var matches={};
    var uid="code";
    var i=0;

    var tag_start="<?nodejs ",tag_end=" nodejs?>";
    code= code.replace(reg0,function(all,_code){
       matches[i]=_code;
       return tag_start+uid+i+++tag_end;
    }).replace(reg1,function(all,_code){
       matches[i]="\nres.write("+_code+");";
       return tag_start+uid+i+++tag_end;
    });
    
    function repl(reg,nostart,noend){
       code=code.replace(reg,function(all,html){
            if(html==undefined || !html.length || html.match(/^\s+$/m))return "";
             html=html.replace(/\n/g,"\\n").replace(/\"/g,"\\\"");
             matches[i]="\nres.write(\""+html+"\");";
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
      js+=matches[i];
    });
    return js;
}

util.directoryCheck=function(dir){
   var fs=require('fs');
   var path=require('path');
   if(!path.existsSync(dir)){
     util.directoryCheck(path.dirname(dir));
     fs.mkdirSync(dir,0777);
   }
}

