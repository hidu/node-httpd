var hosts=exports;

var vhostsItems=[];
var fs=require('fs');
var _config=require('./config');
var vhostDir=__dirname+"/vhosts/";

var defaultConfig={},_default={};
for(var m in _config){
	_default[m]=defaultConfig[m]=_config[m];
}

vhostsItems.push(defaultConfig);

if(!require('path').existsSync(vhostDir))return;

var files=fs.readdirSync(vhostDir);

for(var i=0;i<files.length;i++){
	var config=require("./vhosts/"+files[i]);
	if(!config['documentRoot']){
		console.error("vhost file:"+vhostDir+files[i]+" miss documentRoot");
		process.exit(1);
	}
	var c=_default;
	for(var m in config){
		c[m]=config[m];
	}
	vhostsItems.push(c);
}

console.log(vhostsItems);