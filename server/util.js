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

