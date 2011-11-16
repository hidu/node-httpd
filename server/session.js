var config=require('./conf/default');
var fs=require('fs');
var myu=require('./util');
var path=require('path');
var session_save_path=config.session_savePath;

myu.directoryCheck(session_save_path);

var session={
	read:function(id){
		var p=session_save_path+"/"+id;
		if(path.existsSync(p)){
			var nowTime=new Date();
			fs.utimes(p,nowTime,nowTime);
			var a=fs.readFileSync(p);
			return JSON.parse(a);
		}else{
			return {};
		}
	},
	write:function(id,data){
		var p=session_save_path+"/"+id;
		if(typeof data =='object')data=JSON.stringify(data);
		fs.writeFileSync(p,data);
	},
	destroy:function(id){
		var p=session_save_path+"/"+id;
		fs.unlinkSync(p);
	},
	gc:function(){
		fs.readdir(session_save_path,function(err,files){
			if (err) {
			}else{
				for(var i=0;i<files.length;i++){
				var p=session_save_path+"/"+files[i];
				var stats=fs.lstatSync(p);
				if(stats.mtime.getTime()+config.session_gc_maxlifetime*1000<new Date().getTime()){
					fs.unlink(p);
					console.log('session gc',files[i]);
				}};
		    }
		 });
	}
};
module.exports = session;
