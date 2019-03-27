var JSON1 = {};
String.prototype.format = function (e) { var t = this; if (arguments.length > 0) if (arguments.length == 1 && typeof e == "object") { for (var n in e) if (e[n] != undefined) { var r = new RegExp("({" + n + "})", "g"); t = t.replace(r, e[n]) } } else for (var i = 0; i < arguments.length; i++) if (arguments[i] != undefined) { var r = new RegExp("({)" + i + "(})", "g"); t = t.replace(r, arguments[i]) } return t };
JSON1.request=function(url,success,error){if(url.indexOf("&callback=?")<0){if(url.indexOf("?")>0){url+="&callback=?"}else{url+="?callback=?"}}$.ajax({async:true,url:url,type:"get",dataType:"jsonp",jsonp:"callback",success:function(result){if(typeof(success)=='function'){success(typeof(result)=='string'?eval(result):result)}},error:function(){if(typeof(error)=='function'){error()}}})};
JSON1.jsonp=function(url,funcCallback){window.parseLocation=function(results){var response=$.parseJSON(results);document.body.removeChild(document.getElementById('getJsonP'));delete window.parseLocation;if(funcCallback){funcCallback(response)}};function getJsonP(url){url=url+'&callback=parseLocation';var script=document.createElement('script');script.id='getJsonP';script.src=url;script.async=true;document.body.appendChild(script)}if(XMLHttpRequest){var xhr=new XMLHttpRequest();if('withCredentials'in xhr){var xhr=new XMLHttpRequest();xhr.onreadystatechange=function(){if(xhr.readyState==4){if(xhr.status==200){var response=$.parseJSON(xhr.responseText);if(funcCallback){funcCallback(response)}}else if(xhr.status==0||xhr.status==400){getJsonP(url)}else{}}};xhr.open('GET',url,true);xhr.send()}else if(XDomainRequest){var xdr=new XDomainRequest();xdr.onerror=function(err){};xdr.onload=function(){var response=JSON.parse(xdr.responseText);if(funcCallback){funcCallback(response)}};xdr.open('GET',url);xdr.send()}else{getJsonP(url)}}};
var EARTH_RADIUS = 6378137.0; //单位M
var PI = Math.PI; 
function getRad(d){ 
return d*PI/180.0; 
} 

Helper ={
    MarkerIcon: [
        L.icon({
            iconUrl: 'resources/images/marker.svg',                       
            iconSize:     [60, 60], // size of the icon                        
            iconAnchor:   [17, 55], // point of the icon which will correspond to marker's location                        
            popupAnchor:  [0, -60] // point from which the popup should open relative to the iconAnchor
        }),
        L.icon({
            iconUrl: 'resources/images/marker2.svg',                       
            iconSize:     [60, 60], // size of the icon                        
            iconAnchor:   [17, 55], // point of the icon which will correspond to marker's location                        
            popupAnchor:  [0, -60] // point from which the popup should open relative to the iconAnchor
        })
    ],
    getDirectionCardinal: function(direction){
            var ret = "";
            direction = parseFloat(direction);
            switch (true){
                case (direction >= 338 || direction <= 22 ):
                    ret = LANGUAGE.COM_MSG28;
                    break;
                case (direction >= 23 && direction <= 75 ):
                    ret = LANGUAGE.COM_MSG29;
                    break;
                case (direction >= 76 && direction <= 112 ):
                    ret = LANGUAGE.COM_MSG21;
                    break;
                case (direction >= 113 && direction <= 157 ):
                    ret = LANGUAGE.COM_MSG22;
                    break;
                case (direction >= 158 && direction <= 202 ):
                    ret = LANGUAGE.COM_MSG23;
                    break;
                case (direction >= 203 && direction <= 247 ):
                    ret = LANGUAGE.COM_MSG24;
                    break;
                case (direction >= 248 && direction <= 292 ):
                    ret = LANGUAGE.COM_MSG25;
                    break;
                case (direction >= 293 && direction <= 337 ):
                    ret = LANGUAGE.COM_MSG26;
                    break;
                default: ret = LANGUAGE.COM_MSG27;
            }
            return ret;
        },
    getSpeedValue: function (speedUnit, speed) {
        var ret = 0;
        switch (speedUnit) {
            case "KT": ret = parseInt(speed * 1.852); break;
            case "KPH": ret = parseInt(speed); break;
            case "MPS": ret = parseInt(speed * 0.277777778); break;
            case "MPH": ret = parseInt(speed * 0.621371192); break;
            default: break;
        }
        return ret;
    },
    getSpeedUnit: function (speedUnit) {
        var ret = "";
        switch (speedUnit) {
            case "KT": ret = "kt"; break;
            case "KPH": ret = "km/h"; break;
            case "MPS": ret = "m/s"; break;
            case "MPH": ret = "mile/h"; break;
            default: break;
        }
        return ret;
    },
    getMileageValue: function (speedUnit, mileage) {
        var ret = 0;
        switch (speedUnit) {
            case "KT": ret = parseInt(mileage * 0.53995680345572); break;
            case "KPH": ret = parseInt(mileage); break;
            case "MPS": ret = parseInt(mileage * 1000); break;
            case "MPH": ret = parseInt(mileage * 0.62137119223733); break;
            default: break;
        }
        return ret;
    },
    getMileageUnit: function (speedUnit) {
        var ret = "";
        switch (speedUnit) {
            case "KT": ret = "mile"; break;
            case "KPH": ret = "km"; break;
            case "MPS": ret = "m"; break;
            case "MPH": ret = "mile"; break;
            default: break;
        }
        return ret;
    },
    getAddressByGeocoder: function(latlng,replyFunc){
        var url = "https://nominatim.sinopacific.com.ua/reverse.php?format=json&lat={0}&lon={1}&zoom=18&addressdetails=1".format(latlng.lat, latlng.lng);
        var coords = latlng.lat + ', '+ latlng.lng;
        JSON1.jsonp(url, function(result){ 
            if (result.display_name) { replyFunc(result.display_name); }else{ replyFunc(coords); }            
        },function(){
            url = "https://nominatim.openstreetmap.org/reverse?format=json&lat={0}&lon={1}&zoom=18&addressdetails=1".format(latlng.lat, latlng.lng);
            JSON1.jsonp(url, function(result2){ 
                if (result2.display_name) { replyFunc(result2.display_name); }else{ replyFunc(coords); }      
            },function(){
                replyFunc(coords);
            });       
        });        
       
    },
    getLatLngByGeocoder: function(address,replyFunc){
        var url = "https://nominatim.openstreetmap.org/search?q={0}&format=json&polygon=1&addressdetails=1".format(address);
        var res = null;
        JSON1.jsonp(url, function(result){ 
            res = new L.LatLng(result[0].lat, result[0].lon);
            replyFunc(res);
        },function(){
            url = "https://nominatim.sinopacific.com.ua/?q={0}&format=json&polygon=1&addressdetails=1".format(address);
            JSON1.jsonp(url, function(result2){ 
                res = new L.LatLng(result2[0].lat, result2[0].lon);
                replyFunc(res);
            },function(){
                replyFunc(res);
            });
        });
    },
    
   createMap: function(option){
        var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { name: 'osm', attribution: '' });            
        var googleStreets = L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',{
            maxZoom: 22,
            subdomains:['mt0','mt1','mt2','mt3']
        });           
        var googleSatelitte = L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}',{
            maxZoom: 20,
            subdomains:['mt0','mt1','mt2','mt3']
        });              
            
        var map = L.map(option.target, { zoomControl: false, center: option.latLng, zoom: option.zoom, layers: [googleStreets] }); 
                        
        var layers = {
            "<span class='mapSwitcherWrapper googleSwitcherWrapper'><img class='layer-icon' src='resources/images/googleRoad.png' alt='' /> <p>Map</p></span>": googleStreets,
            "<span class='mapSwitcherWrapper satelliteSwitcherWrapper'><img class='layer-icon' src='resources/images/googleSatellite.png' alt='' />  <p>Satellite</p></span>": googleSatelitte,
            "<span class='mapSwitcherWrapper openstreetSwitcherWrapper'><img class='layer-icon' src='resources/images/openStreet.png' alt='' /> <p>OpenStreet</p></span>": osm,
        };

        L.control.layers(layers).addTo(map);            

        return map;
    },
    toDegreesMinutesAndSeconds: function (coordinate) {
            var absolute = Math.abs(coordinate);
            var degrees = Math.floor(absolute);
            var minutesNotTruncated = (absolute - degrees) * 60;
            var minutes = Math.floor(minutesNotTruncated);
            var seconds = Math.floor((minutesNotTruncated - minutes) * 60);

            return degrees + " " + minutes + " " + seconds;
    },
    convertDMS: function (lat, lng) {
            var latitude = Helper.toDegreesMinutesAndSeconds(lat);
            var latitudeCardinal = Math.sign(lat) >= 0 ? "N" : "S";

            var longitude = Helper.toDegreesMinutesAndSeconds(lng);
            var longitudeCardinal = Math.sign(lng) >= 0 ? "E" : "W";

            return latitude + " " + latitudeCardinal + "\n" + longitude + " " + longitudeCardinal;
    },
   getDistance:function(lat1,lng1,lat2,lng2){
         var f = getRad((lat1 + lat2)/2);
        var g = getRad((lat1 - lat2)/2);
        var l = getRad((lng1 - lng2)/2);
        
         var sg = Math.sin(g);
         var sl = Math.sin(l);
         var sf = Math.sin(f);
         
         var s,c,w,r,d,h1,h2;
         var a = EARTH_RADIUS;
         var fl = 1/298.257;
        
         sg = sg*sg;
         sl = sl*sl;
         sf = sf*sf;
         
         s = sg*(1-sl) + (1-sf)*sl;
         c = (1-sg)*(1-sl) + sf*sl;
         
         w = Math.atan(Math.sqrt(s/c));
        r = Math.sqrt(s*c)/w;
        d = 2*w*a;
         h1 = (3*r -1)/2/c;
         h2 = (3*r +1)/2/s;
         
         return d*(1 + fl*(h1*sf*(1-sg) - h2*(1-sf)*sg));
   },
   currentCreateLayer:null,
   drawnItems:null   
};
