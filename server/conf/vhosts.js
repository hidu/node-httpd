var hosts=exports;

var path=require('path');
var items=[],
    ports={},
    fs=require('fs'),
    _config=require('./default'),
    defaultHost=_config.defaultHost,
    vhostDir=__dirname+"/vhosts/";


var defaultConfig={};
for(var m in defaultHost){
	defaultConfig[m]=defaultHost[m];
}
ports[defaultConfig.port]=[0];


items.push(defaultConfig);

if(require('path').existsSync(vhostDir)){
	var files=fs.readdirSync(vhostDir).sort();
	for(var i=0;i<files.length;i++){
		var config=require("./vhosts/"+files[i]);
		if(!config['documentRoot']){
			console.error("vhost file:"+vhostDir+files[i]+" miss documentRoot");
			process.exit(1);
		}
		var c={};
		for(var m in defaultConfig){
			c[m]=defaultConfig[m];
		}
		for(var m in config){
			c[m]=config[m];
		}
		c.__filename=files[i];
		items.push(c);
		var _k=c.port;
		ports[_k]?ports[_k].push(i+1):ports[_k]=[i+1];
		c=null;
	}
}

hosts.ports=ports;

var serverNames={},host_ports=[];

for(var i=0;i<items.length;i++){
	if(!items[i]['compileDir']){
    	items[i]['compileDir']=_config.compileDir+"/"+path.relative(_config.compileDir,items[i]['documentRoot']).replace(/\W/gi,"");
	}
	var _name=items[i]['serverName'];
	if(_name && _name.length){
		if(typeof _name=='string'){
			serverNames[_name]?serverNames[_name].push(i):serverNames[_name]=[i];
		}else{
			for(var j=0;j<_name.length;j++){
				var n=_name[j];
				serverNames[n]?serverNames[n].push(i):serverNames[n]=[i];
			}
	    }
	}
}

var serverNames_extensive={};//泛域名配置项
for(var _name in serverNames){
	if(_name.match(/^\*\./)){
		serverNames_extensive[_name.substring(2)]=serverNames[_name];
	}
}

hosts.items=items;

hosts.serverNames=serverNames;
hosts.serverNames_extensive=serverNames_extensive;

//console.log(items);
//console.log(serverNames);

//console.log(hosts.ports);
/**
 * 根据host信息来获取config 
 * @param host 如 127.0.0.1:80  exmaple.com:80
 */
hosts.getConfig=function(host){
	var k=0;
	var _host=host.split(":");
	var serverName=_host[0],port=_host[1];
	var portsIds=hosts.ports[port];
	var nameIds=hosts.serverNames[serverName]||'';
	
	if(nameIds && portsIds){
		for(var i=0;i<portsIds.length;i++){
			if(!k){
				for(var j=0;j<nameIds.length;j++){
					if(portsIds[i]==nameIds[j]){
						k=portsIds[i];break;
					}
				}
			}
		}
	}else if(portsIds && hosts.serverNames && !(/\.\d+$/.test(serverName))){  //处理 *.example.com   *.abc.example.com
		var _name_split=serverName.split(".");
		while(_name_split && !k){
			_name_split.shift();
			var _name=_name_split.join(".");
			nameIds=hosts.serverNames_extensive[_name]||[];
			if(nameIds){
				for(var i=0;i<portsIds.length;i++){
					if(!k){
						for(var j=0;j<nameIds.length;j++){
							if(portsIds[i]==nameIds[j]){
								k=portsIds[i];break;
							}
						}
					}
				}
			}
		}
	}else{
		k=portsIds[0];
	}
	return hosts.items[k];
};

//console.log(hosts);