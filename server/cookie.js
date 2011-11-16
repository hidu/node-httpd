var cookie=exports;

cookie.setcookie=function(res,key,value,expire,properties){
    var date = new Date();
    date.setTime(date.getTime() + (expire||0)*1000);
	res.setHeader('Set-Cookie',key+'='+value + ';' + (properties||"") +'expires=' + date.toUTCString() + ';');
};
cookie.getAllCookie=function(req){
	if(!req.headers['cookie'])return{};
	return require('querystring').parse(req.headers['cookie']);
};