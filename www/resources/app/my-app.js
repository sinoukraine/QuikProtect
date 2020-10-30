String.prototype.format = function(e) {
    var t = this;
    if (arguments.length > 0)
        if (arguments.length == 1 && typeof e == "object") {
            for (var n in e)
                if (e[n] != undefined) {
                    var r = new RegExp("({" + n + "})", "g");
                    t = t.replace(r, e[n])
                }
            URL_SET_ALARM
        } else
            for (var i = 0; i < arguments.length; i++)
                if (arguments[i] != undefined) {
                    var r = new RegExp("({)" + i + "(})", "g");
                    t = t.replace(r, arguments[i])
                }
    return t
};
//JSON1.request=function(url,success,error){if(url.indexOf("&callback=?")<0){if(url.indexOf("?")>0){url+="&callback=?"}else{url+="?callback=?"}}$.ajax({async:true,url:url,type:"get",dataType:"jsonp",jsonp:"callback",success:function(result){if(typeof(success)=='function'){success(typeof(result)=='string'?eval(result):result)}},error:function(){if(typeof(error)=='function'){error()}}})};
//JSON1.jsonp=function(url,funcCallback){window.parseLocation=function(results){var response=$.parseJSON(results);document.body.removeChild(document.getElementById('getJsonP'));delete window.parseLocation;if(funcCallback){funcCallback(response)}};function getJsonP(url){url=url+'&callback=parseLocation';var script=document.createElement('script');script.id='getJsonP';script.src=url;script.async=true;document.body.appendChild(script)}if(XMLHttpRequest){var xhr=new XMLHttpRequest();if('withCredentials'in xhr){var xhr=new XMLHttpRequest();xhr.onreadystatechange=function(){if(xhr.readyState==4){if(xhr.status==200){var response=$.parseJSON(xhr.responseText);if(funcCallback){funcCallback(response)}}else if(xhr.status==0||xhr.status==400){getJsonP(url)}else{}}};xhr.open('GET',url,true);xhr.send()}else if(XDomainRequest){var xdr=new XDomainRequest();xdr.onerror=function(err){};xdr.onload=function(){var response=JSON.parse(xdr.responseText);if(funcCallback){funcCallback(response)}};xdr.open('GET',url);xdr.send()}else{getJsonP(url)}}};
window.NULL = null;
$hub = null;
var localPushLastPayload = null;
window.COM_TIMEFORMAT = 'YYYY-MM-DD HH:mm:ss';

function setUserinfo(user) { localStorage.setItem("COM.QUIKTRAK.LIVE.USERINFO", JSON.stringify(user)); }

function getUserinfo() { var ret = {}; var str = localStorage.getItem("COM.QUIKTRAK.LIVE.USERINFO"); if (str) { ret = JSON.parse(str); } return ret; }

function isJsonString(str) { try { var ret = JSON.parse(str); } catch (e) { return false; } return ret; }

function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
}

function guid() {
    function S4() {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    }
    return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}


function getPlusInfo() {
    var uid = guid();
    if (window.device) {
        if (!localStorage.PUSH_MOBILE_TOKEN) {
            localStorage.PUSH_MOBILE_TOKEN = uid;
        }
        localStorage.PUSH_APP_KEY = BuildInfo.packageName;
        localStorage.PUSH_APPID_ID = BuildInfo.packageName;
        localStorage.DEVICE_TYPE = device.platform;
    } else {
        if (!localStorage.PUSH_MOBILE_TOKEN)
            localStorage.PUSH_MOBILE_TOKEN = uid;
        if (!localStorage.PUSH_APP_KEY)
            localStorage.PUSH_APP_KEY = uid;
        if (!localStorage.PUSH_DEVICE_TOKEN)
            localStorage.PUSH_DEVICE_TOKEN = uid;
        //localStorage.PUSH_DEVICE_TOKEN = "75ba1639-92ae-0c4c-d423-4fad1e48a49d"
        localStorage.PUSH_APPID_ID = 'm.quikprotect.co';
        localStorage.DEVICE_TYPE = "m.quikprotect.co";
    }
}

var inBrowser = 0;
localStorage.notificationChecked = 0;
var loginTimer = 0;


var loginInterval = null;
var pushConfigRetryMax = 40;
var pushConfigRetry = 0;

if (navigator.userAgent.match(/Windows/i)) {
    inBrowser = 1;
}
//alert(navigator.userAgent);

document.addEventListener("deviceready", onDeviceReady, false);

function onDeviceReady() {
    //fix app images and text size
    if (window.MobileAccessibility) {
        window.MobileAccessibility.usePreferredTextZoom(false);
    }
    if (StatusBar) {
        StatusBar.styleDefault();
    }

    setupPush();

    getPlusInfo();

    if (!inBrowser) {
        if (getUserinfo().MinorToken) {
            //login();
            preLogin();
        } else {
            logout();
        }
    }

    document.addEventListener("backbutton", backFix, false);
    document.addEventListener("resume", onAppResume, false);
    document.addEventListener("pause", onAppPause, false);
}

function setupPush() {
    var push = PushNotification.init({
        "android": {
            //"senderID": "264121929701"
        },
        "browser": {
            pushServiceURL: 'https://push.api.phonegap.com/v1/push'
        },
        "ios": {
            "sound": true,
            "vibration": true,
            "badge": true
        },
        "windows": {}
    });
    console.log('after init');

    push.on('registration', function(data) {
        console.log('registration event: ' + data.registrationId);
        //alert( JSON.stringify(data) );

        //localStorage.PUSH_DEVICE_TOKEN = data.registrationId;

        var oldRegId = localStorage.PUSH_DEVICE_TOKEN;
        if (localStorage.PUSH_DEVICE_TOKEN !== data.registrationId) {
            // Save new registration ID
            localStorage.PUSH_DEVICE_TOKEN = data.registrationId;
            // Post registrationId to your app server as the value has changed
            refreshToken(data.registrationId);
        }
    });

    push.on('error', function(e) {
        //console.log("push error = " + e.message);
        alert("push error = " + e.message);
    });

    push.on('notification', function(data) {
        //alert( JSON.stringify(data) );

        //if user using app and push notification comes
        if (data && data.additionalData && data.additionalData.foreground) {
            // if application open, show popup
            showMsgNotification([data.additionalData]);
        } else if (data && data.additionalData && data.additionalData.payload) {
            //if user NOT using app and push notification comes
            App.showIndicator();

            loginTimer = setInterval(function() {
                //alert(localStorage.notificationChecked);
                if (localStorage.notificationChecked) {
                    clearInterval(loginTimer);
                    setTimeout(function() {
                        //alert('before processClickOnPushNotification');
                        processClickOnPushNotification([data.additionalData.payload]);
                        App.hideIndicator();
                    }, 1000);
                }
            }, 1000);
        }
        if (device && device.platform && device.platform.toLowerCase() == 'ios') {
            push.finish(
                () => {
                    console.log('processing of push data is finished');
                },
                () => {
                    console.log(
                        'something went wrong with push.finish for ID =',
                        data.additionalData.notId
                    );
                },
                data.additionalData.notId
            );
        }
    });


    if　 (!localStorage.ACCOUNT) {
        push.clearAllNotifications(
            () => {
                console.log('success');
            },
            () => {
                console.log('error');
            }
        );
    }
}




function onAppPause() {

}

function onAppResume() {
    if (localStorage.ACCOUNT && localStorage.PASSWORD) {
        getNewData();
        getNewNotifications();
    }

}


function backFix(event) {
    var page = App.getCurrentView().activePage;
    if (page.name == "index") {
        App.confirm(LANGUAGE.PROMPT_MSG018, function() {
            navigator.app.exitApp();
        });
    } else {
        mainView.router.back();
    }
}




//clear all push messag plus.push.clear();
//get all push message plus.push.getAllMessage();
//new_not

// Initialize your app
var App = new Framework7({
    material: true,
    //pushState: true,
    sortable: false,
    modalTitle: 'QuikProtect',
    swipeout: true,
    //swipePanel: 'left',
    swipeBackPage: false,
    precompileTemplates: true,
    template7Pages: true,

    onAjaxStart: function(xhr) {
        App.showIndicator();
    },
    onAjaxComplete: function(xhr) {
        App.hideIndicator();
    }

});

// Export selectors engine
var $$ = Dom7;


// Add view
var mainView = App.addView('.view-main', {
    domCache: true,
});





//window.MapTrack = Helper.createMap({ target: 'map', latLng: [0, 0], zoom: 17 });
var MapTrack = null;
window.PosMarker = {};
window.TargetAsset = {};
var StreetViewService = null;
var searchbar = null;
var statusCommand = 1;
var virtualAssetList = null;
var virtualNotificationList = null;
var verifyCheck = {}; // for password reset
var URL_REGISTRATION = "https://app.quikprotect.co/activation/register?";
var PAYPAL_URL = {};
PAYPAL_URL.UPGRADELINK1 = "https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=9SFVGM2W2LFZC"; //REAL subscription link
PAYPAL_URL.UPGRADELINK2 = "https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=UT749QS8G4PLU"; // REAL subscription link

var API_DOMIAN1 = "https://api.m2mglobaltech.com/QuikProtect/V1/Client/";
var API_DOMIAN2 = "https://quiktrak.co/webapp/QuikProtect/Api2/";
var API_DOMIAN3 = "https://api.m2mglobaltech.com/QuikTrak/V1/";
var API_DOMIAN4 = "https://api.m2mglobaltech.com/Quikloc8/V1/";
var API_URL = {};
API_URL.URL_GET_LOGIN = API_DOMIAN1 + "Auth?account={0}&password={1}&appKey={2}&mobileToken={3}&deviceToken={4}&deviceType={5}";
API_URL.URL_GET_LOGOUT = API_DOMIAN1 + "Logoff?MinorToken={0}&deviceToken={1}&mobileToken={2}";
API_URL.URL_EDIT_ASSET = API_DOMIAN1 + "AssetEdit?MajorToken={0}&MinorToken={1}&imei={2}&name={3}&describe1={4}&describe2={5}&describe3={6}&describe4={7}&photo={8}&alias&";
API_URL.URL_ADD_ASSET = API_DOMIAN1 + "Activation?MajorToken={0}&MinorToken={1}&imei={2}&name={3}&describe1={4}&describe2={5}&describe3={6}&describe4={7}";

//API_URL.URL_SET_ALARM = API_DOMIAN1 + "AlarmOptions?MajorToken={0}&MinorToken={1}&imei={2}&geolock={3}&shock={4}&crash={5}&power={6}";
//API_URL.URL_SET_ALARM = API_DOMIAN1 + "AlarmOptions?&imei={0}&geolock={1}&shock={2}&crash={3}&power={4}";
//API_URL.URL_SET_ALARM = API_DOMIAN1 + "AlarmOptions?MajorToken={0}&MinorToken={1}&imei={2}&bilge=false&ignition=false&power={3}&geolock={4}&shock={5}&crash={6}";
//API_URL.URL_SET_ALARM = API_DOMIAN1 + "AlarmOptions2?MajorToken={0}&MinorToken={1}&imeis={2}&alarmOptions={3}";
API_URL.URL_SET_ALARM = API_DOMIAN1 + "AlarmOptions2";

API_URL.URL_EDIT_ACCOUNT = API_DOMIAN1 + "AccountEdit?MajorToken={0}&MinorToken={1}&firstName={2}&surName={3}&mobile={4}&email={5}&address0={6}&address1={7}&address2={8}&address3={9}&address4={10}";
API_URL.URL_NEW_PASSWORD = API_DOMIAN3 + "User/Password?MinorToken={0}&oldpwd={1}&newpwd={2}";
//API_URL.URL_SEND_COM_POS = API_DOMIAN2 + "SendPosCommand2.json?code={0}&imei={1}&timeZone={2}";
//API_URL.URL_SEND_COM_STATUS = API_DOMIAN2 + "SendStatusCommand2.json?code={0}&imei={1}";
//API_URL.URL_SET_GEOLOCK = API_DOMIAN1 + "SetGeoLock?MajorToken={0}&MinorToken={1}&imei={2}&state={3}";
API_URL.URL_SET_GEOLOCK = API_DOMIAN1 + "setGeolock?MajorToken={0}&MinorToken={1}&imei={2}&state={3}";

API_URL.URL_SET_IMMOBILISATION = API_DOMIAN1 + "Relay?MinorToken={0}&imei={1}&state={2}";

API_URL.URL_SET_DOOR = API_DOMIAN4 + "asset/door?MajorToken={0}&MinorToken={1}&code={2}&state={3}";
API_URL.URL_PHOTO_UPLOAD = "https://upload.quiktrak.co/image/Upload";
API_URL.URL_GET_BALANCE = API_DOMIAN1 + "Balance?MajorToken={0}&MinorToken={1}";
API_URL.URL_VERIFY_BY_EMAIL = API_DOMIAN1 + "VerifyCodeByEmail?email={0}";
API_URL.URL_RESET_PASSWORD = API_DOMIAN1 + "ForgotPassword?account={0}&newPassword={1}&checkNum={2}";
API_URL.URL_PREUPGRADE = API_DOMIAN1 + "PreUpgrade?MajorToken={0}&MinorToken={1}&imei={2}";
API_URL.URL_UPGRADE = API_DOMIAN1 + "Upgrade?MajorToken={0}&MinorToken={1}&imei={2}";
API_URL.URL_GET_NEW_NOTIFICATIONS = API_DOMIAN1 + "Alarms?MinorToken={0}&deviceToken={1}";
API_URL.URL_GET_ADDR_BY_GEO1 = "https://map.quiktrak.co/reverse.php?format=json&lat={0}&lon={1}&zoom=18&addressdetails=1";
API_URL.URL_GET_ADDR_BY_GEO2 = "https://nominatim.openstreetmap.org/reverse?format=json&lat={0}&lon={1}&zoom=18&addressdetails=1";
API_URL.URL_SUPPORT = "https://support.quiktrak.eu/?name={0}&loginName={1}&email={2}&phone={3}&s={4}";

API_URL.URL_ROUTE = "https://www.google.com/maps/dir/?api=1&destination={0},{1}"; //&travelmode=walking
API_URL.URL_REFRESH_TOKEN = API_DOMIAN3 + "User/RefreshToken";

API_URL.SEND_COM_POS = API_DOMIAN1 + "Location";
API_URL.SEND_COM_STATUS = API_DOMIAN1 + "Status";

var cameraButtons = [{
        text: 'Take picture',
        onClick: function() {
            getImage(1);
        }
    },
    {
        text: 'From gallery',
        onClick: function() {
            getImage(0);
        }
    },
    {
        text: 'Cancel',
        color: 'red',
        onClick: function() {
            //App.alert('Cancel clicked');
        }
    },
];




var html = Template7.templates.template_Login_Screen();
$$(document.body).append(html);
//App.loginScreen();
html = Template7.templates.template_Popover_Menu();
$$(document.body).append(html);
html = Template7.templates.template_AssetList();
$$('.navbar-fixed').append(html);
/*html = Template7.templates.template_Popover_Notification();
$$(document.body).append(html);*/

if (inBrowser) {
    if (localStorage.ACCOUNT && localStorage.PASSWORD) {
        //login();
        preLogin();
    } else {
        logout();
    }
}



var virtualAssetList = App.virtualList('.assets_list', {
    // search item by item
    searchAll: function(query, items) {
        var foundItems = [];
        for (var i = 0; i < items.length; i++) {
            // Check if title contains query string
            if (items[i].Name.toLowerCase().indexOf(query.toLowerCase().trim()) >= 0) foundItems.push(i);
        }
        // Return array with indexes of matched items
        return foundItems;
    },
    //List of array items
    items: [],
    height: 88,
    renderItem: function(index, item) {
        var photo = getAssetIcoSrc(item.IMEI);


        var ret = `
        <li class="item-link item-content item_asset" data-id="${ item.IMEI }">
            <div class="item-media"><img src="${ photo }" alt="" /></div>
            <div class="item-inner">
            <div class="item-title-row">
            <div class="item-title">${ item.Name }</div>
            </div>
            </div>
        </li>,
        `;
        return ret;
    },
    // Display the each item using Template7 template parameter
    // template: '<li class="item-link item-content item_asset" data-id="{{IMEI}}">' +
    //     '<div class="item-media">{{#if AppPhoto}}<img src="{{AppPhoto}}" alt="">{{else}}<img src="resources/images/svg_asset.svg" alt="">{{/if}} </div>' +
    //     '<div class="item-inner">' +
    //     '<div class="item-title-row">' +
    //     '<div class="item-title">{{Name}}</div>' +
    //     '</div>' +
    //     '</div>' +
    //     '</li>',
});



// if (!ret) {
//     var assetList = getAssetList();
//     var assetInfo = assetList[asset];
//     if (assetInfo.Photo && pattern.test(assetInfo.Photo)) {
//         ret = 'http://upload.quiktrak.co/Attachment/images/' + assetInfo.Photo + '?' + new Date().getTime();
//     }
// }



$$('body').on('click', 'a.external', function(event) {
    event.preventDefault();
    var href = this.getAttribute('href');
    if (href) {
        if (typeof navigator !== "undefined" && navigator.app) {
            navigator.app.loadUrl(href, { openExternal: true });
        } else {
            window.open(href, '_blank');
        }
    }
    return false;
});


$$('.login-form').on('submit', function(e) {
    e.preventDefault();
    //login();
    preLogin();
    return false;
});

$$('body').on('click', '#account, #password', function(e) {
    setTimeout(function() {
        $('.login-screen-content').scrollTop(200);
    }, 1000);
});

$$('.forgetPwd').on('click', function() {
    App.closeModal();
});

$$('body').on('click', '.notification_button', function(e) {
    getNewNotifications({ 'loadPageNotification': true });
    $$('.notification_button').removeClass('new_not');
});
$$('body').on('click', '.deleteAllNotifications', function() {
    App.confirm(LANGUAGE.PROMPT_MSG019, function() {
        removeAllNotifications();
        $$('.deleteAllNotifications').addClass('disabled');
        mainView.router.back({
            pageName: 'index',
            force: true
        });
    });
});
$$('.button_search').on('click', function() {
    /*$('.searchbar').slideDown(400, function(){
        $$('.searchbar input').focus();
    });  */
    //$$('.searchbar').removeClass('fadeOutUp');
    $$('.searchbar').addClass('fadeInDown').show();
    $$('.searchbar input').focus();
});
$$('body').on('click', '.showAlarmNotice', function() {
    showModalMessage(LANGUAGE.ALARM_MSG01, LANGUAGE.PROMPT_MSG055);
});
$$('body').on('click', '.routeButton', function() {
    var that = $$(this);
    var lat = that.data('Lat');
    var lng = that.data('Lng');
    if (lat && lng) {
        var href = API_URL.URL_ROUTE.format(
            encodeURIComponent(lat),
            encodeURIComponent(lng)
        );

        if (typeof navigator !== "undefined" && navigator.app) {
            //plus.runtime.openURL(href);
            navigator.app.loadUrl(href, { openExternal: true });
        } else {
            window.open(href, '_blank');
        }
    }

});


//$$('#menu li').on('click', function () {
$$('body').on('click', '#menu li', function() {
    var id = $$(this).attr('id');
    var activePage = App.getCurrentView().activePage;

    switch (id) {
        case 'menuHome':
            mainView.router.back({
                pageName: 'index',
                force: true
            });
            break;
        case 'menuAddAsset':
            mainView.router.loadPage('resources/templates/asset.add.html');
            break;
        case 'menuRecharge':
            recharge();
            break;
        case 'menuAlarms':
            if (typeof(activePage) == 'undefined' || (activePage && activePage.name != "alarms.assets")) {
                checkBalanceAndLoadPage('alarms.assets');
            }
            break;
        case 'menuProfile':
            profile();
            break;
        case 'menuSupport':
            if (typeof(activePage) == 'undefined' || (activePage && activePage.name != "user.support")) {
                loadPageSupport();
            }
            break;
        case 'menuLogout':
            App.confirm(LANGUAGE.PROMPT_MSG012, LANGUAGE.MENU_MSG04, function() {
                logout();
            });
            break;

    }
});

/*$$('body').on('click', '.navbar_title ', function(){
    //var payload = {};
    //console.log('')
    var payload = {
        "type":"sms_received",
        "alarm":"location",
        "imsi":"43688875284305",
        "AssetName":"Jack Da Roo",
        "imei":"0352544071889449",
        "messageReference":"c8e721a6-c549-4aa3-a940-0082bed7e0c5",
        "state":"received",
        "Lat":-32.03289,
        "Lng":115.86833,
        "positionTime":"2017-02-07T12:17:25",
        "speed":"0.19",
        "direct":"0.00"
    };
    //plus.push.createMessage("Welcome", payload, {cover:false} );
    showMsgNotification([payload]);
});*/

$$(document).on('click', 'a.tab-link', function(e) {
    e.preventDefault();
    var currentPage = App.getCurrentView().activePage.name;
    var page = $$(this).data('id');
    if (currentPage != page) {
        switch (page) {
            case 'profile':
                profile();
                break;
            case 'profile.newPwd':
                profileNewPwd();
                break;
        }
    }
    return false;
});

$$('body').on('click', '.backToIndex', function() {
    returnToIndex();
});

/*$$('body').on('click', '.navbar_title_index', function(){
    console.log('click');
    var message = {};
    var all_msg = [];
    var msg = {
        "Imei":"0354188046337940",
        "AssetName": "Test",
        "Acc":"OFF",
        "Relay":"OFF",
        "Battery":"4477(mV)",
        "Charger":"0(mV)",
        "Power":"1",
        "GPS":"V,0",
        "GSM":"2,-107(dB)",
        "GPRS":"Offline",
        "alarm":"status",
        "Imsi":"43688875220070"
    };
    msg = JSON.stringify(msg);
    message.payload = msg;
    all_msg.push(message);
    setNotificationList(all_msg);
});*/

$$(document).on('change', '.leaflet-control-layers-selector[type="radio"]', function() {
    if (window.TargetAsset.IMEI) {
        var span = $$(this).next();
        var switcherWrapper = span.find('.mapSwitcherWrapper');
        if (switcherWrapper && switcherWrapper.hasClass('satelliteSwitcherWrapper')) {
            window.PosMarker[window.TargetAsset.IMEI].setIcon(Helper.MarkerIcon[1]);
        } else {
            window.PosMarker[window.TargetAsset.IMEI].setIcon(Helper.MarkerIcon[0]);
        }
    }
});
$$(document).on('refresh', '.pull-to-refresh-content', function(e) {
    getNewNotifications({ 'ptr': true });
});

$$('.assets_list').on('click', '.item_asset', function() {
    TargetAsset.IMEI = $$(this).data("id");
    TargetAsset.IMG = '';
    var assetList = getAssetList();
    var asset = assetList[TargetAsset.IMEI];
    var userCredits = getUserinfo().UserInfo.SMSTimes;
    var assetImgSrc = getAssetImgSrc(TargetAsset.IMEI);

    TargetAsset.IMSI = asset.IMSI;
    /*var geolockList = getGeolockList();
    var geolockState = false;
    if (geolockList) {
        if (geolockList[TargetAsset.IMEI] && geolockList[TargetAsset.IMEI].state === true){
            geolockState = true;
        }
    }
*/
    /*App.alert('hi');*/
    var immobState = false;
    var geolockState = false;
    var doorlockState = false;

    if ((parseInt(asset.StatusNew) & 1) > 0) {
        geolockState = true;
    }
    if ((parseInt(asset.StatusNew) & 2) > 0) {
        immobState = true;
    }
    if ((parseInt(asset.StatusNew) & 4) > 0) {
        doorlockState = true;
    }
    mainView.router.load({
        url: 'resources/templates/asset.html',
        context: {
            Name: asset.Name,
            ImgSrc: assetImgSrc,
            IMEI: asset.IMEI,
            /*Geolock: geolockState,  */
            Credits: userCredits,
            Geolock: geolockState,
            Immob: immobState,
            Doorlock: doorlockState,
        }
    });
});




/*App.onPageBeforeRemove('notification', function(page){
	App.params.swipePanel = true;
});*/

App.onPageInit('notification', function(page) {
    //App.params.swipePanel = false;
    //console.log( );
    //clearNotificationList();
    //App.alert('hi');
    virtualNotificationList = App.virtualList('.notification_list', {
        //List of array items
        height: 73,
        items: [],
        // Display the each item using Template7 template parameter
        renderItem: function(index, item) {
            var ret = '';
            //alert(JSON.stringify(item));
            var time = null;
            if (typeof item == 'object' && item.alarm) {
                switch (item.alarm) {
                    case 'Status':
                        if (item.CreateDateTime) {
                            time = item.CreateDateTime;
                        } else {
                            time = item.StatusTime;
                        }
                        ret = '<li class="swipeout" data-id="' + item.listIndex + '" data-alarm="' + item.alarm + '" >' +
                            '<div class="swipeout-content item-content">' +
                            '<div class="item-inner">' +
                            '<div class="item-title-row">' +
                            '<div class="item-title">' + item.AssetName + '</div>' +
                            '<div class="item-after">' + time + '</div>' +
                            '</div>' +
                            '<div class="item-subtitle">' + item.alarm + '</div>' +
                            '</div>' +
                            '</div>' +
                            '<div class="swipeout-actions-left">' +
                            '<a href="#" class="swipeout-delete swipeout-overswipe" data-confirm="' + LANGUAGE.PROMPT_MSG001 + '" data-confirm-title="' + LANGUAGE.PROMPT_MSG000 + '" data-close-on-cancel="true">Delete</a>' +
                            '</div>' +
                            '</li>';
                        break;
                    default:

                        if (item.PositionTime) {
                            time = item.PositionTime;
                        } else if (item.positionTime) {
                            time = item.positionTime;
                        }
                        ret = '<li class="swipeout" data-id="' + item.listIndex + '" data-alarm="' + item.alarm + '" data-lat="' + item.Lat + '" data-lng="' + item.Lng + '" data-speed="' + item.Speed + '" data-direct="' + item.Direction + '" data-time="' + time + '" data-imei="' + item.Imei + '" data-name="' + item.AssetName + '" >' +
                            '<div class="swipeout-content item-content">' +
                            '<div class="item-inner">' +
                            '<div class="item-title-row">' +
                            '<div class="item-title">' + item.AssetName + '</div>' +
                            '<div class="item-after">' + time + '</div>' +
                            '</div>' +
                            '<div class="item-subtitle">' + item.alarm + '</div>' +
                            '</div>' +
                            '</div>' +
                            '<div class="swipeout-actions-left">' +
                            '<a href="#" class="swipeout-delete swipeout-overswipe" data-confirm="' + LANGUAGE.PROMPT_MSG001 + '" data-confirm-title="' + LANGUAGE.PROMPT_MSG000 + '" data-close-on-cancel="true">Delete</a>' +
                            '</div>' +
                            '</li>';
                }
            }

            return ret;
        }
    });

    var user = localStorage.ACCOUNT;
    var notList = getNotificationList();
    //console.log(notList[user]);
    showNotification(notList[user]);
    getNewNotifications();

    notificationWrapper = $$('.notification_list');
    notificationWrapper.on('deleted', '.swipeout', function() {
        var index = $$(this).data('id');
        removeNotificationListItem(index);
    });

    notificationWrapper.on('click', '.swipeout', function() {
        if (!$$(this).hasClass('transitioning')) { //to preven click when swiping
            var data = {};
            data.lat = $$(this).data('lat');
            data.lng = $$(this).data('lng');
            data.alarm = $$(this).data('alarm');

            var index = $$(this).data('id');
            var list = getNotificationList();
            var user = localStorage.ACCOUNT;
            var msg = list[user][index];
            var props = null;

            if (msg) {
                if (msg.payload) {
                    props = isJsonString(msg.payload);
                    if (!props) {
                        props = msg.payload;
                    }
                } else {
                    props = isJsonString(msg);
                    if (!props) {
                        props = msg;
                    }
                }
            }
            //console.log(props);
            if (data.alarm == 'Status') {
                loadStatusPage(props);
            } else if (props && parseFloat(data.lat) && parseFloat(data.lat)) {
                loadPositionPage(props);
            } else {
                App.alert(LANGUAGE.PROMPT_MSG023);
            }

        }
    });

});



App.onPageInit('resetPwd', function(page) {
    $$('.backToLogin').on('click', function() {
        App.loginScreen();
    });
    $$('.sendEmail').on('click', function() {
        var email = $$(page.container).find('input[name="Email"]').val();

        if (!email) {
            App.alert(LANGUAGE.PASSWORD_RESET_MSG01);
        } else {
            var url = API_URL.URL_VERIFY_BY_EMAIL.format(email);
            App.showPreloader();
            JSON1.request(url, function(result) {
                    console.log(result);

                    if (result.MajorCode == '000' && result.MinorCode == '0000') {
                        verifyCheck.email = email;
                        verifyCheck.CheckCode = result.Data.CheckCode;
                        mainView.router.loadPage('resources/templates/resetPwdCode.html');
                    } else {
                        App.alert(LANGUAGE.PASSWORD_RESET_MSG07);
                    }

                    App.hidePreloader();
                },
                function() { App.hidePreloader(); }
            );
        }

    });
});
App.onPageInit('resetPwdCode', function(page) {
    $$('.sendVerifyCode').on('click', function() {
        var VerifyCode = $$(page.container).find('input[name="VerifyCode"]').val();

        if (!VerifyCode) {
            App.alert(LANGUAGE.PASSWORD_RESET_MSG04);
        } else {
            if (VerifyCode == verifyCheck.CheckCode) {
                mainView.router.load({
                    url: 'resources/templates/resetPwdNew.html',
                    context: {
                        Email: verifyCheck.email
                    }
                });
            } else {
                App.alert(LANGUAGE.PASSWORD_RESET_MSG08);
            }
        }

    });
});
App.onPageInit('resetPwdNew', function(page) {
    $$('.sendPwdNew').on('click', function() {
        var email = $$(page.container).find('input[name="Email"]').val();
        var newPassword = $$(page.container).find('input[name="newPassword"]').val();
        var newPasswordRepeat = $$(page.container).find('input[name="newPasswordRepeat"]').val();

        if (!newPassword && newPassword.length < 6) {
            App.alert(LANGUAGE.PASSWORD_RESET_MSG05);
        } else {
            if (newPassword != newPasswordRepeat) {
                App.alert(LANGUAGE.PASSWORD_RESET_MSG10);
            } else {
                var url = API_URL.URL_RESET_PASSWORD.format(email, encodeURIComponent(newPassword), verifyCheck.CheckCode);
                App.showPreloader();
                JSON1.request(url, function(result) {
                        if (result.MajorCode == '000' && result.MinorCode == '0000') {
                            App.alert(LANGUAGE.PASSWORD_RESET_MSG12);
                            $$('#account').val(email);
                            App.loginScreen();

                            /*mainView.router.back({
                              pageName: 'index',
                              force: true
                            }); */
                        } else {
                            App.alert(LANGUAGE.PASSWORD_RESET_MSG11);
                        }

                        App.hidePreloader();
                    },
                    function() { App.hidePreloader(); }
                );
            }
        }

    });
});

App.onPageInit('asset', function(page) {
    //console.log(page);
    //alert('asset page loaded');
    var assetList = getAssetList();
    var asset = assetList[TargetAsset.IMEI];

    $$('.upload_photo, .asset_img img').on('click', function() {
        // App.actions(cameraButtons);
        assetList = getAssetList();
        asset = assetList[TargetAsset.IMEI];

        var assetImgSrc = getAssetImgSrc(TargetAsset.IMEI);

        mainView.router.load({
            url: 'resources/templates/asset.edit.html',
            context: {
                Name: asset.Name,
                IMEI: asset.IMEI,
                Describe1: asset.Describe1,
                Describe2: asset.Describe2,
                Describe3: asset.Describe3,
                Describe4: asset.Describe4,
                ImgSrc: assetImgSrc
            }
        });

    });

    $$('.loadPageAssetEdit').on('click', function() {
        assetList = getAssetList();
        asset = assetList[TargetAsset.IMEI];

        var assetImgSrc = getAssetImgSrc(TargetAsset.IMEI);

        mainView.router.load({
            url: 'resources/templates/asset.edit.html',
            context: {
                Name: asset.Name,
                IMEI: asset.IMEI,
                Describe1: asset.Describe1,
                Describe2: asset.Describe2,
                Describe3: asset.Describe3,
                Describe4: asset.Describe4,
                ImgSrc: assetImgSrc
            }
        });
    });

    $$('.loadPageAssetAlarm').on('click', function() {
        checkBalanceAndLoadPage('asset.alarm');
    });

    $$('.loadPageAssetPosition').on('click', function() {
        sendCommand(API_URL.SEND_COM_POS, TargetAsset.IMSI);
        /*var userInfo = getUserinfo();
        var timeZone = moment().utcOffset() / 60;

        var url = API_URL.URL_SEND_COM_POS.format(userInfo.MinorToken,
            TargetAsset.IMEI,
            timeZone
        );
        //console.log(url);
        App.showPreloader();
        JSON1.request(url, function(result) {

            console.log(result);
            App.hidePreloader();
            if (result.length > 0 || result.ERROR == "ARREARS") {
                showNoCreditMessage();

            } else if (result.ERROR == "LOCKED") {
                showModalMessage(TargetAsset.IMEI, LANGUAGE.PROMPT_MSG054);
            } else {
                balance();
                App.addNotification({
                    hold: 3000,
                    message: LANGUAGE.COM_MSG03
                });
            }


        }, function(result) {
            App.hidePreloader();
            App.alert(LANGUAGE.COM_MSG02);
        });*/

    });


    $$('.loadPageAssetStatus').on('click', function() {
        sendCommand(API_URL.SEND_COM_STATUS, TargetAsset.IMSI);
        /*var userInfo = getUserinfo();

        var url = API_URL.URL_SEND_COM_STATUS.format(userInfo.MinorToken,
            TargetAsset.IMEI
        );

        App.showPreloader();
        JSON1.request(url, function(result) {
                App.hidePreloader();
                if (result.length > 0 || result.ERROR == "ARREARS") {
                    showNoCreditMessage();
                } else if (result.ERROR == "LOCKED") {
                    showModalMessage(TargetAsset.IMEI, LANGUAGE.PROMPT_MSG054);
                } else {
                    balance();
                    App.addNotification({
                        hold: 3000,
                        message: LANGUAGE.COM_MSG03
                    });
                }


            }, function(result) {
                App.hidePreloader();
                App.alert(LANGUAGE.COM_MSG02);
            }

        );*/
    });

    $$('.setGeolockState').on('click', function() {
        var state = $$(this).data('state');
        var userInfo = getUserinfo();

        var url = API_URL.URL_SET_GEOLOCK.format(userInfo.MajorToken,
            userInfo.MinorToken,
            TargetAsset.IMEI,
            state
        );

        App.showPreloader();
        JSON1.request(url, function(result) {
            App.hidePreloader();
            console.log(result);

            if (result.MajorCode == '000') {
                if (result.MinorCode == '1006') {
                    showNoCreditMessage();
                } else {

                    App.addNotification({
                        hold: 3000,
                        message: LANGUAGE.COM_MSG03
                    });

                    var updateAsset = getStatusNewState2({ 'asset': asset, 'changeState': { 'name': 'geolock', 'state': result.Data.State } });
                    if (updateAsset) {
                        updateAssetList(updateAsset);
                    }
                    $$('.setGeolockState').toggleClass('disabled');
                    balance();
                }


            } else if (result.MajorCode == '100' && result.MinorCode == '1006') {
                showNoCreditMessage();
            } else if (result.MajorCode == '200' && result.Data && result.Data.ERROR == 'NOT_SUPPORT') {
                showModalMessage(TargetAsset.IMEI, LANGUAGE.PROMPT_MSG053);
            } else {

                App.addNotification({
                    hold: 5000,
                    message: LANGUAGE.COM_MSG16
                });
                balance();
            }


        }, function(result) {
            App.hidePreloader();
            App.alert(LANGUAGE.COM_MSG02);
        });

    });

    $$('.setImmobState').on('click', function () {
        var state = $$(this).data('state');
        var userInfo = getUserinfo();

        var url = API_URL.URL_SET_IMMOBILISATION.format(userInfo.MinorToken,
                TargetAsset.IMEI,
                state
            );
        console.log(url);
        App.showPreloader();
        JSON1.request(url, function(result){
                App.hidePreloader();
                console.log(result);

                if (result.MajorCode == '000') {
                    if (result.MinorCode == '1006'){
                        showNoCreditMessage();
                    }else{
                        App.addNotification({
                            hold: 3000,
                            message: LANGUAGE.COM_MSG03
                        });

                        var updateAsset = getStatusNewState2({'asset':asset, 'changeState':{'name':'immob','state':result.Data.State}});
                        if (updateAsset) {
                            updateAssetList(updateAsset);
                        }
                        $$('.setImmobState').toggleClass('disabled');
                        balance();
                    }
                }else if(result.MajorCode == '100' && result.MinorCode == '1006'){
                    showNoCreditMessage();
                }else{
                    App.addNotification({
                        hold: 5000,
                        message: LANGUAGE.COM_MSG16
                    });
                    balance();
                }


            }, function(result){
                App.hidePreloader();
                App.alert(LANGUAGE.COM_MSG02);
            }
        );

    });

    $$('.setDoorState').on('click', function() {
        var state = $$(this).data('state');
        var userInfo = getUserinfo();

        var url = API_URL.URL_SET_DOOR.format(userInfo.MajorToken,
            userInfo.MinorToken,
            TargetAsset.IMEI,
            state
        );

        /*App.showPreloader();
        JSON1.request(url, function(result){
                App.hidePreloader();
                console.log(result);

                if (result.MajorCode == '000') {
                    if (result.MinorCode == '1006') {
                        showNoCreditMessage();
                    }else{

                        App.addNotification({
                            hold: 3000,
                            message: LANGUAGE.COM_MSG03
                        });

                        var updateAsset = getStatusNewState({'asset':asset, 'changeState':{'name':'doorlock','state':result.Data.State}});
                        if (updateAsset) {
                            updateAssetList(updateAsset);
                        }
                        $$('.setGeolockState').toggleClass('disabled');
                        balance();
                    }


                }else if(result.MajorCode == '100' && result.MinorCode == '1006'){
                    showNoCreditMessage();
                }else if(result.MajorCode == '200' && result.Data && result.Data.ERROR == 'NOT_SUPPORT'){
                    showModalMessage(TargetAsset.IMEI, LANGUAGE.PROMPT_MSG053);
                }else{

                    App.addNotification({
                        hold: 5000,
                        message: LANGUAGE.COM_MSG16
                    });
                    balance();
                }


            }, function(result){
                App.hidePreloader();
                App.alert(LANGUAGE.COM_MSG02);
            }
        );*/

    });


});



App.onPageInit('asset.edit', function(page) {
    $$(page.container).find('.upload_photo, .asset_img img').on('click', function(e) {
        App.actions(cameraButtons);
    });

    $$('.assetEditSave').on('click', function(e) {
        App.showPreloader();
        var assetImg = {
            IMEI: $$(page.container).find('input[name="IMEI"]').val(),
            src: $$(page.container).find('img[name="photo"]').attr('src')
        };
        var userInfo = getUserinfo();
        var url = API_URL.URL_EDIT_ASSET.format(userInfo.MajorToken,
            userInfo.MinorToken,
            $$(page.container).find('input[name="IMEI"]').val(),
            encodeURIComponent($$(page.container).find('input[name="Name"]').val()),
            encodeURIComponent($$(page.container).find('input[name="Describe1"]').val()),
            encodeURIComponent($$(page.container).find('input[name="Describe2"]').val()),
            encodeURIComponent($$(page.container).find('input[name="Describe3"]').val()),
            encodeURIComponent($$(page.container).find('input[name="Describe4"]').val()),
            TargetAsset.IMG
        );

        JSON1.request(url, function(result) {
                console.log(result);
                if (result.MajorCode == '000') {
                    if (TargetAsset.IMG) {

                        deleteOldImg(TargetAsset.IMEI)
                    }

                    if (assetImg.src !== 'resources/images/svg_add_photo_general.svg') {
                        result.Data.AppPhoto = assetImg.src;
                    }

                    updateAssetList(result.Data);
                    //setAssetImg(assetImg);
                    init_AssetList();
                } else if (result.MajorCode == '200') {
                    App.alert(LANGUAGE.PROMPT_MSG014);
                } else {
                    App.alert(LANGUAGE.PROMPT_MSG014);
                }

                App.hidePreloader();
            },
            function() {
                App.hidePreloader();
                App.alert(result.ErrorMsg);
            }
        );
    });
});

App.onPageBeforeRemove('asset.edit', function(page) {
    App.closeModal();
});

App.onPageInit('asset.add', function(page) {

    $$('.upload_photo, .asset_img img').on('click', function() {
        App.actions(cameraButtons);
    });

    $$('.assetAddSave').on('click', function(e) {
        App.showPreloader();
        var asset = {
            IMEI: $$(page.container).find('input[name="IMEI"]').val(),
            Name: $$(page.container).find('input[name="Name"]').val(),
            Describe1: $$(page.container).find('input[name="Describe1"]').val(),
            Describe2: $$(page.container).find('input[name="Describe2"]').val(),
            Describe3: $$(page.container).find('input[name="Describe3"]').val(),
            Describe4: $$(page.container).find('input[name="Describe4"]').val()
        };
        var assetImg = {
            IMEI: asset.IMEI,
            src: $$(page.container).find('img[name="photo"]').attr('src')
        };
        var userInfo = getUserinfo();
        var url = API_URL.URL_ADD_ASSET.format(userInfo.MajorToken,
            userInfo.MinorToken,
            asset.IMEI,
            asset.Name,
            asset.Describe1,
            asset.Describe2,
            asset.Describe3,
            asset.Describe4
        );

        JSON1.request(url, function(result) {
                console.log(result);
                if (result.MajorCode == '000') {
                    //asset.AppPhoto = assetImg.src;

                    updateAssetList(asset);
                    //setAssetImg(assetImg);
                    init_AssetList();
                } else {
                    App.alert('Wrong IMEI or IMEI already added');
                }
                App.hidePreloader();
            },
            function() {
                App.hidePreloader();
                App.alert(result.ErrorMsg);
            }
        );
    });
});


App.onPageInit('asset.alarm', function(page) {
    var alarm = $$(page.container).find('input[name = "checkbox-alarm"]');
    var allCheckboxesLabel = $$(page.container).find('label.item-content');
    var allCheckboxes = allCheckboxesLabel.find('input');
    var alarmFields = ['geolock', 'tilt', 'impact', 'power', 'input', 'accOff', 'accOn', 'lowBattery'];


    alarm.on('change', function(e) {
        if ($$(this).prop('checked')) {
            allCheckboxes.prop('checked', true);
        } else {
            allCheckboxes.prop('checked', false);
        }
    });

    allCheckboxes.on('change', function(e) {
        if ($$(this).prop('checked')) {
            alarm.prop('checked', true);
        }
    });

    $$('.alarmSave').on('click', function(e) {
        var alarmOptions = {
            IMEI: TargetAsset.IMEI,
            options: 0,
        };
        if (alarm.is(":checked")) {
            alarmOptions.alarm = true;
        }

        $.each(alarmFields, function(index, value) {
            var field = $$(page.container).find('input[name = "checkbox-' + value + '"]');
            if (!field.is(":checked")) {
                alarmOptions.options = alarmOptions.options + parseInt(field.val(), 10);
            }
        });

        var userInfo = getUserinfo();
        var data = {
            MajorToken: userInfo.MajorToken,
            MinorToken: userInfo.MinorToken,
            imeis: TargetAsset.IMEI,
            alarmOptions: alarmOptions.options,
        };
        //console.log(urlLogin);
        App.showPreloader();
        JSON1.requestPost(API_URL.URL_SET_ALARM, data, function(result) {
                console.log(result);
                if (result.MajorCode == '000') {
                    if (result.MinorCode == '1006') {
                        showNoCreditMessage();
                    } else {
                        updateAlarmOptVal(alarmOptions);
                        mainView.router.back();
                        balance();
                    }
                } else if (result.MajorCode == '100' && result.MinorCode == '1006') {
                    showNoCreditMessage();
                } else {
                    App.addNotification({
                        hold: 5000,
                        message: LANGUAGE.COM_MSG16
                    });
                    balance();
                }
                App.hidePreloader();
            },
            function() {
                App.hidePreloader();
                App.alert(LANGUAGE.COM_MSG16);
            }
        );

    });

});


App.onPageInit('profile', function(page) {
    //var mobileToken = !localStorage["PUSH_MOBILE_TOKEN"]? '123' : localStorage["PUSH_MOBILE_TOKEN"];
    //var deviceToken = !localStorage["PUSH_DEVICE_TOKEN"]? '123' : localStorage["PUSH_DEVICE_TOKEN"];
    //App.alert('mobileToken: '+mobileToken+', deviceToken: '+deviceToken);
    $$('.saveProfile').on('click', function(e) {
        var user = {
            FirstName: $$(page.container).find('input[name="FirstName"]').val(),
            SurName: $$(page.container).find('input[name="SurName"]').val(),
            Mobile: $$(page.container).find('input[name="Mobile"]').val(),
            Email: $$(page.container).find('input[name="Email"]').val(),
            Address0: $$(page.container).find('input[name="Address0"]').val(),
            Address1: $$(page.container).find('input[name="Address1"]').val(),
            Address2: $$(page.container).find('input[name="Address2"]').val(),
            Address3: $$(page.container).find('input[name="Address3"]').val(),
            Address4: $$(page.container).find('input[name="Address4"]').val()
        };

        var userInfo = getUserinfo();
        var url = API_URL.URL_EDIT_ACCOUNT.format(userInfo.MajorToken,
            userInfo.MinorToken,
            user.FirstName,
            user.SurName,
            user.Mobile,
            user.Email,
            user.Address0,
            user.Address1,
            user.Address2,
            user.Address3,
            user.Address4
        );

        App.showPreloader();
        JSON1.request(url, function(result) {
                console.log(userInfo);
                console.log(user);
                console.log(url);
                console.log(result);
                if (result.MajorCode == '000') {
                    userInfo.UserInfo = {
                        FirstName: user.FirstName,
                        SurName: user.SurName,
                        Mobile: user.Mobile,
                        Email: user.Email,
                        Address0: user.Address0,
                        Address1: user.Address1,
                        Address2: user.Address2,
                        Address3: user.Address3,
                        Address4: user.Address4,
                        Expires: userInfo.UserInfo.Expires,
                        SMSTimes: userInfo.UserInfo.SMSTimes,
                        SecurityCode: userInfo.UserInfo.SecurityCode,
                    };

                    setUserinfo(userInfo);

                    mainView.router.back();
                } else if (result.MajorCode == '200') {
                    App.alert(LANGUAGE.PROMPT_MSG014);
                } else {
                    App.alert(LANGUAGE.PROMPT_MSG014);
                }
                App.hidePreloader();
            },
            function() {
                App.hidePreloader();
                App.alert(LANGUAGE.COM_MSG02);
            }
        );
    });
});

App.onPageInit('alarms.assets', function(page) {

    var assetListContainer = $$(page.container).find('.alarmsAssetList');
    var searchForm = $$('.searchbarAlarmsAssets');
    var assetList = getAssetList();
    var newAssetlist = [];
    var keys = Object.keys(assetList);

    $.each(keys, function(index, value) {
        assetList[value].Selected = false;
        newAssetlist.push(assetList[value]);
    });

    newAssetlist.sort(function(a, b) {
        if (a.Name < b.Name) return -1;
        if (a.Name > b.Name) return 1;
        return 0;
    });

    var virtualAlarmsAssetsList = App.virtualList(assetListContainer, {
        items: newAssetlist,
        height: function(item) {
            return 88;
        },
        searchAll: function(query, items) {
            var foundItems = [];
            for (var i = 0; i < items.length; i++) {
                // Check if title contains query string
                if (items[i].Name.toLowerCase().indexOf(query.toLowerCase().trim()) >= 0) foundItems.push(i);
            }
            // Return array with indexes of matched items
            return foundItems;
        },
        renderItem: function(index, item) {
            var ret = '';
            var assetImg = 'resources/images/svg_asset.svg';
            if (item.AppPhoto) {
                assetImg = item.AppPhoto;
            }
            ret += '<li data-index="' + index + '" >';
            ret += '<label class="label-checkbox item-content no-fastclick">';
            if (item.Selected) {
                ret += '<input type="checkbox" name="alarms-assets" value="" data-imei="' + item.IMEI + '" checked="true" >';
            } else {
                ret += '<input type="checkbox" name="alarms-assets" value="" data-imei="' + item.IMEI + '" >';
            }
            ret += '<div class="item-media"><img src="' + assetImg + '" alt="" /></div>';
            ret += '<div class="item-inner">';
            ret += '<div class="item-title-row">';
            ret += '<div class="item-title color-white">' + item.Name + '</div>';
            ret += '<div class="item-after">';
            ret += '<i class="icon icon-form-checkbox"></i>';
            ret += '</div>';
            ret += '</div>';
            ret += '</div>';
            ret += '</label>';
            ret += '</li>';

            return ret;
        }
    });

    var searchbarAlarmsAssets = App.searchbar(searchForm, {
        searchList: '.alarmsAssetList',
        searchIn: '.alarmsAssetList .item-title',
        found: '.list-block-search-alarms-assets',
        notFound: '.searchbar-not-found-alarms-assets',
        onDisable: function(s) {
            $(s.container).slideUp();
        }
    });

    $$('.button_search_alarm_assets').on('click', function() {
        $$('.searchbarAlarmsAssets').addClass('fadeInDown').show();
        $$('.searchbarAlarmsAssets input').focus();
    });

    var SelectAll = $$(page.container).find('input[name="select-all"]');

    SelectAll.on('change', function() {
        var state = false;
        if ($$(this).prop('checked')) {
            state = true;
        }
        $.each(virtualAlarmsAssetsList.items, function(index, value) {
            value.Selected = state;
        });
        virtualAlarmsAssetsList.replaceAllItems(virtualAlarmsAssetsList.items);
    });


    assetListContainer.on('change', 'input[name="alarms-assets"]', function() {
        var index = $$(this).closest('li').data('index');
        if (this.checked) {
            virtualAlarmsAssetsList.items[index].Selected = true;
        } else {
            virtualAlarmsAssetsList.items[index].Selected = false;
        }
    });

    $('.saveAssets').on('click', function() {
        var assets = [];
        $.each(virtualAlarmsAssetsList.items, function(index, value) {
            if (value.Selected) {
                assets.push(value.IMEI);
            }
        });

        if (assets.length > 0) {

            mainView.router.load({
                url: 'resources/templates/alarms.select.html',
                context: {
                    Assets: assets.toString()
                }
            });
        } else {
            App.addNotification({
                hold: 3000,
                message: LANGUAGE.PROMPT_MSG029
            });
        }

    });

});

App.onPageInit('alarms.select', function(page) {

    var alarm = $$(page.container).find('input[name = "checkbox-alarm"]');
    var allCheckboxesLabel = $$(page.container).find('label.item-content');
    var allCheckboxes = allCheckboxesLabel.find('input');
    var assets = $$(page.container).find('input[name="Assets"]').val();
    var alarmFields = ['geolock', 'tilt', 'impact', 'power', 'input', 'accOff', 'accOn', 'lowBattery'];

    alarm.on('change', function(e) {
        if ($$(this).prop('checked')) {
            allCheckboxes.prop('checked', true);
        } else {
            allCheckboxes.prop('checked', false);
        }
    });

    allCheckboxes.on('change', function(e) {
        if ($$(this).prop('checked')) {
            alarm.prop('checked', true);
        }
    });

    $$('.saveAlarm').on('click', function(e) {
        var alarmOptions = {
            IMEI: assets,
            options: 0,
        };
        if (alarm.is(":checked")) {
            alarmOptions.alarm = true;
        }

        $.each(alarmFields, function(index, value) {
            var field = $$(page.container).find('input[name = "checkbox-' + value + '"]');
            if (!field.is(":checked")) {
                alarmOptions.options = alarmOptions.options + parseInt(field.val(), 10);
            }
        });

        var userInfo = getUserinfo();
        var data = {
            MajorToken: userInfo.MajorToken,
            MinorToken: userInfo.MinorToken,
            imeis: alarmOptions.IMEI,
            alarmOptions: alarmOptions.options,
        };
        //console.log(urlLogin);
        App.showPreloader();
        JSON1.requestPost(API_URL.URL_SET_ALARM, data, function(result) {
                console.log(result);
                if (result.MajorCode == '000') {
                    if (result.MinorCode == '1006') {
                        showNoCreditMessage();
                    } else {
                        updateAlarmOptVal(alarmOptions);
                        mainView.router.back({
                            pageName: 'index',
                            force: true
                        });
                        balance();
                    }
                } else if (result.MajorCode == '100' && result.MinorCode == '1006') {
                    showNoCreditMessage();
                } else {
                    App.addNotification({
                        hold: 5000,
                        message: LANGUAGE.COM_MSG16
                    });
                    balance();
                }
                App.hidePreloader();
            },
            function() {
                App.hidePreloader();
                App.alert(LANGUAGE.COM_MSG16);
            }
        );

    });

});

App.onPageInit('profile.newPwd', function(page) {
    $$('.saveProfileNewPwd').on('click', function(e) {
        var password = {
            old: $$(page.container).find('input[name="Password"]').val(),
            new: $$(page.container).find('input[name="NewPassword"]').val(),
            confirm: $$(page.container).find('input[name="NewPasswordConfirm"]').val()
        };
        if ($$(page.container).find('input[name="NewPassword"]').val().length >= 6) {
            if (password.new == password.confirm) {
                var userInfo = getUserinfo();
                var url = API_URL.URL_NEW_PASSWORD.format(userInfo.MinorToken,
                    encodeURIComponent(password.old),
                    encodeURIComponent(password.new)
                );
                //console.log(url);
                App.showPreloader();
                JSON1.request(url, function(result) {
                        //console.log(result);
                        if (result.MajorCode == '000') {
                            App.alert(LANGUAGE.PROMPT_MSG015, function() {
                                logout();
                            });
                        } else {
                            App.alert(LANGUAGE.PROFILE_MSG15);
                        }
                        App.hidePreloader();
                    },
                    function() {
                        App.hidePreloader();
                        App.alert(LANGUAGE.COM_MSG02);
                    }
                );
            } else {
                App.alert(LANGUAGE.COM_MSG17); //Passwords do not match
            }
        } else {
            App.alert(LANGUAGE.COM_MSG18); // Password should contain at least 6 characters
        }
    });
});

App.onPageInit('recharge', function(page) {
    $$('.button_buy_now').on('click', function(event) {
        event.preventDefault();
        setTimeout(function() {
            App.modal({
                //title: LANGUAGE.PROMPT_MSG016,
                text: LANGUAGE.PROMPT_MSG016, //LANGUAGE.PROMPT_MSG017
                buttons: [{
                        text: LANGUAGE.COM_MSG19,
                        onClick: function() {
                            //myApp.alert('You clicked first button!')
                            afterRechergeCredits();

                        }
                    },
                    {
                        text: LANGUAGE.COM_MSG20,
                        onClick: function() {
                            //mainView.router.back();
                            //afterRechergeCredits();
                        }
                    },
                ]
            });
        }, 3000);

    });

});


App.onPageInit('asset.position', function(page) {
    //showMap();

    var panoButton = $$(page.container).find('.pano_button');
    var lat = panoButton.data('lat');
    var lng = panoButton.data('lng');
    var latlng = new google.maps.LatLng(lat, lng);
    var params = {
        'lat': lat,
        'lng': lng,
    };
    showMap(params);
    StreetViewService.getPanorama({ location: latlng, radius: 50 }, processSVData);

    panoButton.on('click', function() {
        var params = {
            'lat': $$(this).data('lat'),
            'lng': $$(this).data('lng'),
        };
        showStreetView(params);
    });
});

App.onPageInit('asset.status', function(page) {
    var Acc = $$(page.container).find('input[name="Acc"]').val();
    var Relay = $$(page.container).find('input[name="Relay"]').val();
    var Charger = $$(page.container).find('input[name="Charger"]').val();
    var Battery = $$(page.container).find('input[name="Battery"]').val();
    var Power = $$(page.container).find('input[name="Power"]').val();
    var GPS = $$(page.container).find('input[name="GPS"]').val();
    var GSM = $$(page.container).find('input[name="GSM"]').val();
    var GPRS = $$(page.container).find('input[name="GPRS"]').val();

    var clickedLink = '';
    var popoverHTML = '';



    if (Acc) {
        $$(page.container).find('.open-acc').on('click', function() {
            popoverHTML = '<div class="popover popover-status">' +
                '<p class="color-dealer">' + LANGUAGE.STATUS_MSG05 + ' - ' + Acc + '</p>' +
                '<p>' + LANGUAGE.STATUS_MSG29 + '</p>' +
                '</div>';
            App.popover(popoverHTML, this);
        });
    }
    if (Relay) {
        $$(page.container).find('.open-relay').on('click', function() {
            popoverHTML = '<div class="popover popover-status">' +
                '<p class="color-dealer">' + LANGUAGE.STATUS_MSG06 + ' - ' + Relay + '</p>' +
                '<p>' + LANGUAGE.STATUS_MSG30 + '</p>' +
                '</div>';
            App.popover(popoverHTML, this);
        });
    }
    if (Battery) {
        $$(page.container).find('.open-battery').on('click', function() {
            popoverHTML = '<div class="popover popover-status">' +
                '<p class="color-dealer">' + LANGUAGE.STATUS_MSG07 + ' - ' + Battery + '</p>' +
                '<p>' + LANGUAGE.STATUS_MSG32 + '</p>' +
                '</div>';
            App.popover(popoverHTML, this);
        });
    }
    if (Charger) {
        $$(page.container).find('.open-charger').on('click', function() {
            popoverHTML = '<div class="popover popover-status">' +
                '<p class="color-dealer">' + LANGUAGE.STATUS_MSG08 + ' - ' + Charger + '</p>' +
                '<p>' + LANGUAGE.STATUS_MSG31 + '</p>' +
                '</div>';
            App.popover(popoverHTML, this);
        });
    }
    if (Power) {
        $$(page.container).find('.open-power').on('click', function() {
            clickedLink = this;
            popoverHTML = '<div class="popover popover-status">' +
                '<p class="color-dealer">' + LANGUAGE.STATUS_MSG09 + ' - ' + Power + '</p>' +
                '<p>' + LANGUAGE.STATUS_MSG39 + '</p>' +
                '</div>';
            App.popover(popoverHTML, this);
        });
    }

    if (GPS) {
        $$(page.container).find('.open-gps').on('click', function() {
            popoverHTML = '<div class="popover popover-status">' +
                '<p class="color-dealer">' + LANGUAGE.STATUS_MSG10 + ' - ' + GPS + '</p>' +
                '<p>' + LANGUAGE.STATUS_MSG34 + '</p>' +
                '</div>';
            App.popover(popoverHTML, this);
        });
    }

    if (GPRS) {
        $$(page.container).find('.open-gprs').on('click', function() {
            popoverHTML = '<div class="popover popover-status">' +
                '<p class="color-dealer">' + LANGUAGE.STATUS_MSG10 + ' - ' + GPRS + '</p>' +
                '<p>' + LANGUAGE.STATUS_MSG36 + '</p>' +
                '</div>';
            App.popover(popoverHTML, this);
        });
    }
    if (GSM) {
        $$(page.container).find('.open-gsm').on('click', function() {
            popoverHTML = '<div class="popover popover-status">' +
                '<p class="color-dealer">' + LANGUAGE.STATUS_MSG11 + ' - ' + GSM + '</p>' +
                '<p>' + LANGUAGE.STATUS_MSG35 + '</p>' +
                '</div>';
            App.popover(popoverHTML, this);
        });
    }

});

App.onPageInit('asset.edit.photo', function(page) {
    //page.context.imgSrc = 'resources/images/add_photo_general.png';

    initCropper();
    //alert(cropper);

    //After the selection or shooting is complete, jump out of the crop page and pass the image path to this page
    //image.src = plus.webview.currentWebview().imgSrc;
    //image.src = "img/head-default.jpg";

    $$('#save').on('click', function() {
        saveImg();
    });
    $$('#redo').on('click', function() {
        cropper.rotate(90);
    });
    $$('#undo').on('click', function() {
        cropper.rotate(-90);
    });
});

App.onPageInit('upgrade', function(page) {
    var upgradeButton = $$(page.container).find('.buttonUpgrade');

    upgradeButton.on('click', function() {
        var planTime = $$(this).data('planTime');

        //console.log(TargetAsset.IMEI);
        var userInfo = getUserinfo();

        var urlPreUpgrade = API_URL.URL_PREUPGRADE.format(userInfo.MajorToken,
            userInfo.MinorToken,
            TargetAsset.IMEI);

        App.showPreloader();
        JSON1.request(urlPreUpgrade, function(result) {
                App.hidePreloader();
                console.log(result);
                if (result.MajorCode == '000') {
                    upgrade(planTime);
                } else if (result.MajorCode == '101') {
                    console.log('here');
                    App.confirm(LANGUAGE.PROMPT_MSG008, function() {
                        var href = URL_REGISTRATION + 'imei=' + TargetAsset.IMEI + '&pn=3'; // pn - is a project number 3 means QuikProtect
                        if (typeof navigator !== "undefined" && navigator.app) {
                            navigator.app.loadUrl(href, { openExternal: true });
                        } else {
                            window.open(href, '_blank');
                        }
                        setTimeout(function() {
                            App.confirm(LANGUAGE.PROMPT_MSG009, function() {
                                logout();
                            });
                        }, 2000);
                    });
                } else {
                    App.alert(LANGUAGE.PROMPT_MSG006, function() {
                        //clearUserInfo();
                    });
                }
            },
            function() {
                App.hidePreloader();
                App.alert(LANGUAGE.COM_MSG02);
            });

    });
});




function clearUserInfo() {

    var deviceToken = !localStorage.PUSH_DEVICE_TOKEN ? '' : localStorage.PUSH_DEVICE_TOKEN;
    var mobileToken = !localStorage.PUSH_MOBILE_TOKEN ? '' : localStorage.PUSH_MOBILE_TOKEN;
    var MinorToken = getUserinfo().MinorToken;
    var userName = !localStorage.ACCOUNT ? '' : localStorage.ACCOUNT;

    var alarmList = getAlarmList();
    var assetImgList = getAssetImgList();
    var pushList = getNotificationList();


    window.PosMarker = {};
    TargetAsset = {};

    localStorage.clear();




    if (alarmList) {
        localStorage.setItem("COM.QUIKTRAK.LIVE.ALARMLIST", JSON.stringify(alarmList));
    }
    if (assetImgList) {
        localStorage.setItem("COM.QUIKTRAK.LIVE.ASSETIMGLIST", JSON.stringify(assetImgList));
    }
    if (pushList) {
        localStorage.setItem("COM.QUIKTRAK.LIVE.NOTIFICATIONLIST", JSON.stringify(pushList));
    }

    if (virtualAssetList) {
        virtualAssetList.deleteAllItems();
    }

    if (deviceToken) {
        localStorage.PUSH_DEVICE_TOKEN = deviceToken;
    }
    if (mobileToken) {
        localStorage.PUSH_MOBILE_TOKEN = mobileToken;
    }


    JSON1.request(API_URL.URL_GET_LOGOUT.format(MinorToken, deviceToken, mobileToken), function(result) {
        console.log(result);
    });
    $$("input[name='account']").val(userName);
}

function logout() {
    //alert('logout');
    clearUserInfo();
    App.loginScreen();
}

function preLogin() {
    hideKeyboard();
    getPlusInfo();
    App.showPreloader();
    if (localStorage.PUSH_DEVICE_TOKEN) {
        login();
    } else {
        loginInterval = setInterval(reGetPushDetails, 500);
    }
}

function reGetPushDetails() {
    getPlusInfo();
    if (pushConfigRetry <= pushConfigRetryMax) {
        pushConfigRetry++;
        if (localStorage.PUSH_DEVICE_TOKEN) {
            clearInterval(loginInterval);
            login();
        }
    } else {
        clearInterval(loginInterval);
        pushConfigRetry = 0;
        login();
        //setTimeout(function(){
        //    App.alert(LANGUAGE.PROMPT_MSG052);
        //},2000);
    }
}

function login() {
    //alert('inBrowser: '+inBrowser);
    getPlusInfo();

    //hideKeyboard();
    //alert('login called');

    //App.showPreloader();
    var mobileToken = !localStorage.PUSH_MOBILE_TOKEN ? '111' : localStorage.PUSH_MOBILE_TOKEN;
    var appKey = !localStorage.PUSH_APP_KEY ? '111' : localStorage.PUSH_APP_KEY;
    var deviceToken = !localStorage.PUSH_DEVICE_TOKEN ? '111' : localStorage.PUSH_DEVICE_TOKEN;
    var deviceType = !localStorage.DEVICE_TYPE ? 'webapp' : localStorage.DEVICE_TYPE;
    var account = $$("input[name='account']");
    var password = $$("input[name='password']");

    var urlLogin = API_URL.URL_GET_LOGIN.format(!account.val() ? localStorage.ACCOUNT : account.val(), encodeURIComponent(!password.val() ? localStorage.PASSWORD : password.val()), appKey, mobileToken, encodeURIComponent(deviceToken), deviceType);
    console.log(urlLogin);
    JSON1.request(urlLogin, function(result) {
            App.hidePreloader();
            console.log(result);
            if (result.MajorCode == '000') {

                if (account.val()) {
                    localStorage.ACCOUNT = account.val();
                    localStorage.PASSWORD = password.val();
                }
                account.val(null);
                password.val(null);
                setUserinfo(result.Data);
                setAssetList(result.Data.AssetArray);
                updateUserCrefits(result.Data.UserInfo.SMSTimes);


                /*setTimeout( function(){
                    checkIsBalanceLow(result.Data.UserInfo.SMSTimes);
                },5000);*/


                init_AssetList();
                initSearchbar();


                getNewNotifications();
                App.closeModal();

                //console.log(localStorage['COM.QUIKTRAK.LIVE.GEOLOCKLIST']);
                //alert(urlLogin);
                //alert('mobileToken: '+mobileToken+', appKey: '+appKey+', deviceToken: '+deviceToken);


            } else {
                App.alert(LANGUAGE.LOGIN_MSG01, function() {
                    //clearUserInfo();
                });
                App.loginScreen();
            }
        },
        function() {
            App.hidePreloader();
            App.alert(LANGUAGE.COM_MSG02);
            App.loginScreen();
        }
    );

}

function getNewData() {
    var mobileToken = !localStorage.PUSH_MOBILE_TOKEN ? '111' : localStorage.PUSH_MOBILE_TOKEN;
    var appKey = !localStorage.PUSH_APP_KEY ? '111' : localStorage.PUSH_APP_KEY;
    var deviceToken = !localStorage.PUSH_DEVICE_TOKEN ? '111' : localStorage.PUSH_DEVICE_TOKEN;
    var deviceType = !localStorage.DEVICE_TYPE ? 'webapp' : localStorage.DEVICE_TYPE;

    var urlLogin = API_URL.URL_GET_LOGIN.format(localStorage.ACCOUNT, encodeURIComponent(localStorage.PASSWORD), appKey, mobileToken, encodeURIComponent(deviceToken), deviceType);

    JSON1.request(urlLogin, function(result) {
            console.log(result);
            if (result.MajorCode == '000') {
                setUserinfo(result.Data);
                setAssetList(result.Data.AssetArray);
                updateUserCrefits(result.Data.UserInfo.SMSTimes);

            }
        },
        function() { console.log('error on getNewData()'); }
    );
}

function refreshToken(newDeviceToken) {
    console.log('refreshToken() called');
    var userInfo = getUserinfo();

    if (localStorage.PUSH_MOBILE_TOKEN && userInfo.MajorToken && userInfo.MinorToken && newDeviceToken) {
        var data = {
            MajorToken: userInfo.MajorToken,
            MinorToken: userInfo.MinorToken,
            MobileToken: localStorage.PUSH_MOBILE_TOKEN,
            DeviceToken: newDeviceToken,
        };

        //console.log(urlLogin);
        JSON1.requestPost(API_URL.URL_REFRESH_TOKEN, data, function(result) {
                if (result.MajorCode == '000') {

                } else {

                }
            },
            function() { console.log('error during refresh token'); }
        );
    } else {
        console.log('not loggined');
    }

}

function hideKeyboard() {
    document.activeElement.blur();
    $$("input").blur();
}

function init_AssetList() {
    var assetList = getAssetList();

    var newAssetlist = [];
    var keys = Object.keys(assetList);
    for (var i = 0, len = keys.length; i < len; i++) {
        newAssetlist.push(assetList[keys[i]]);
    }

    newAssetlist.sort(function(a, b) {
        if (a.Name < b.Name) return -1;
        if (a.Name > b.Name) return 1;
        return 0;
    });

    returnToIndex();

    virtualAssetList.replaceAllItems(newAssetlist);


    //console.log(assetList);

    /*var mobileToken = !localStorage["PUSH_MOBILE_TOKEN"]? '123' : localStorage["PUSH_MOBILE_TOKEN"];
    var appKey = !localStorage["PUSH_APPID_ID"]? '123' : localStorage["PUSH_APPID_ID"];
    var deviceToken = !localStorage["PUSH_DEVICE_TOKEN"]? '123' : localStorage["PUSH_DEVICE_TOKEN"];
    var deviceType = !localStorage["DEVICE_TYPE"]? 'android' : localStorage["DEVICE_TYPE"];
   	alert('mobileToken: '+mobileToken+', appKey: '+appKey+', deviceToken: '+deviceToken+', deviceType: '+deviceType);*/
    //console.log('mobileToken: '+mobileToken+', appKey: '+appKey+', deviceToken: '+deviceToken+', deviceType: '+deviceType);
}

function returnToIndex() {
    mainView.router.back({
        pageName: 'index',
        force: true
    });
}

function profileNewPwd() {
    mainView.router.load({
        url: 'resources/templates/profile.newPwd.html',
        context: {

        }
    });
}

function checkIsBalanceLow(val) {
    if (val < 6) {
        var modalTex = '<div class="color-red custom-modal-title">' + LANGUAGE.PROMPT_MSG025 + '</div>' +
            '<div class="custom-modal-text">' + LANGUAGE.PROMPT_MSG024 + '</div>' +
            '<div class="custom-modal-text">' + LANGUAGE.PROMPT_MSG026 + '</div>' +
            '<div class="remaining_wrapper custom-modal-remaining">' +
            '<p>' + LANGUAGE.COM_MSG01 + ': <span class="user_credits">' + val + '</span></p>' +
            '</div>';

        switch (true) {
            /*case ( val > 1 && val < 6 ):
                modalTex = '<div class="color-red custom-modal-title">'+ LANGUAGE.PROMPT_MSG025 +'</div>' +
				    		'<div class="custom-modal-text">'+ LANGUAGE.PROMPT_MSG024 +'</div>' +
				    		'<div class="custom-modal-text">'+ LANGUAGE.PROMPT_MSG026 +'</div>' +
				    		'<div class="remaining_wrapper custom-modal-remaining">' +
		          				'<p>'+ LANGUAGE.COM_MSG01 + ': <span class="user_credits">' + val + '</span></p>' +
		        			'</div>';
                break;*/
            case (val < 2):
                modalTex = '<div class="color-red custom-modal-title">' + LANGUAGE.PROMPT_MSG027 + '</div>' +
                    '<div class="custom-modal-text">' + LANGUAGE.PROMPT_MSG028 + '</div>' +
                    '<div class="custom-modal-text">' + LANGUAGE.PROMPT_MSG026 + '</div>';
                break;

        }

        App.modal({
            title: '<img class="custom-modal-logo" src="resources/images/login_logo.png" alt=""/>',
            text: modalTex,

            buttons: [{
                    text: LANGUAGE.COM_MSG20
                },
                {
                    text: LANGUAGE.COM_MSG19,
                    //bold: true,
                    onClick: function() {
                        recharge();
                    }
                },
            ]
        });
    }
}

function profile() {
    var userInfo = getUserinfo().UserInfo;
    mainView.router.load({
        url: 'resources/templates/profile.html',
        context: {
            FirstName: userInfo.FirstName,
            SurName: userInfo.SurName,
            Mobile: userInfo.Mobile,
            Email: userInfo.Email,
            Address0: userInfo.Address0,
            Address1: userInfo.Address1,
            Address2: userInfo.Address2,
            Address3: userInfo.Address3,
            Address4: userInfo.Address4,
        }
    });
}

function recharge() {
    var MinorToken = getUserinfo().MinorToken;
    var CountryCode = getUserinfo().UserInfo.CountryCode;

    var button10 = 'AMZXU82SZ795C';
    var button50 = 'LGPBRHAY673Y6';
    var button100 = 'DH5S8642H6QRJ';
    var buttonCur = 'USD';

    /*AUS*/
    /*var button10  = 'WTEPHVZ7VLF7C';
    var button50  = 'F5QPW8CA2USAE';
    var button100 = '8SPGQTA6M3P84';
    var buttonCur = 'AUD';*/

    //var testButton10 = '7787VAJBNRTFE';
    //var testButton50 = 'TLXUQLZ5C85CG';
    //var testButton100 = '77RQ5LQQVM8P8';


    switch (CountryCode) {
        /*case 'USA':
            button10  = 'XTKUPGEYWZ3T4';
            button50  = 'KWC3YWFGZTW28';
            button100 = 'QTULPNEWWN6CN';
            buttonCur = 'USD';
            break;*/
        case 'CAN':
            button10 = '9JGXLTLZARGM2';
            button50 = '9FN267ZWCU7GW';
            button100 = 'SB8W7ZN7V4V9W';
            buttonCur = 'CAD';
            break;
    }

    mainView.router.load({
        url: 'resources/templates/recharge.html',
        context: {
            userCode: MinorToken,
            dealerNumber: 3, // 2 - means M-Protekt
            other: 'QuikProtect-app',
            button10: button10,
            button50: button50,
            button100: button100,
            buttonCur: buttonCur
        },

    });
}

function upgrade(planTime) {
    var userInfo = getUserinfo();
    var href = PAYPAL_URL.UPGRADELINK1 + '&on0=IMEI&os0=' + TargetAsset.IMEI + '&on1=MajorToken&os1=' + userInfo.MajorToken + '&on2=MinorToken&os2=' + userInfo.MinorToken + '&on3=ProjectNumber&os3=3';
    if (planTime == '2') {
        href = PAYPAL_URL.UPGRADELINK2 + '&on0=IMEI&os0=' + TargetAsset.IMEI + '&on1=MajorToken&os1=' + userInfo.MajorToken + '&on2=MinorToken&os2=' + userInfo.MinorToken + '&on3=ProjectNumber&os3=3';
    }

    if (typeof navigator !== "undefined" && navigator.app) {
        navigator.app.loadUrl(href, { openExternal: true });
    } else {
        window.open(href, '_blank');
    }

    setTimeout(function() {
        App.alert(LANGUAGE.PROMPT_MSG013);
    }, 2000);

}



function loadPositionPage(params) {

    window.TargetAsset.IMEI = params.Imei;
    var details = {
        direct: '',
        speed: 0,
        mileage: '-',
        templateUrl: 'resources/templates/asset.position.html',
        latlng: {},
        name: '',
        time: '',
        deirectionCardinal: ''
    };

    window.PosMarker[params.Imei] = L.marker([params.Lat, params.Lng], { icon: Helper.MarkerIcon[0] });
    window.PosMarker[params.Imei].setLatLng([params.Lat, params.Lng]);

    if (params.Speed) {
        details.speed = parseInt(params.Speed);
    }

    details.latlng.lat = params.Lat ? params.Lat : params.lat;
    details.latlng.lng = params.Lng ? params.Lng : params.lng;
    details.name = params.AssetName ? params.AssetName : params.name;
    details.time = params.PositionTime ? params.PositionTime : params.time;
    details.direct = params.Direction ? params.Direction : params.direct;
    details.direct = parseInt(details.direct);
    details.deirectionCardinal = Helper.getDirectionCardinal(details.direct);

    checkMapExisting();

    mainView.router.load({
        url: details.templateUrl,
        context: {
            Name: details.name,
            Time: details.time,
            Direction: details.deirectionCardinal + ' (' + details.direct + '&deg;)',
            Mileage: details.mileage,
            Speed: details.speed,
            Address: LANGUAGE.COM_MSG10,
            Lat: details.latlng.lat,
            Lng: details.latlng.lng,
            Coords: 'GPS: ' + Helper.convertDMS(details.latlng.lat, details.latlng.lng),
        }
    });

    Helper.getAddressByGeocoder(details.latlng, function(address) {
        $$('body .display_address').html(address);
    });
}

function loadStatusPage(msg) {
    mainView.router.load({
        url: 'resources/templates/asset.status.html',
        context: msg,
    });
}

function processSVData(data, status) {
    var SVButton = $$(document).find('.pano_button');
    var parrent = SVButton.closest('.pano_button_wrapper');

    if (SVButton) {
        if (status === 'OK') {
            parrent.removeClass('disabled');
        } else {
            parrent.addClass('disabled');
            console.log('Street View data not found for this location.');
        }
    }
}

function showStreetView(params) {
    var dynamicPopup = '<div class="popup">' +
        '<div class="float_button_wrapper back_button_wrapper close-popup"><i class="f7-icons">close</i></div>' +
        '<div class="pano_map">' +
        '<div id="pano" class="pano" ></div>' +
        '</div>' +
        '</div>';
    App.popup(dynamicPopup);

    var panoramaOptions = {
        position: new google.maps.LatLng(params.lat, params.lng),
        pov: {
            heading: 0,
            pitch: 0
        },
        linksControl: false,
        panControl: false,
        enableCloseButton: false,
        addressControl: false
    };
    var panorama = new google.maps.StreetViewPanorama(document.getElementById('pano'), panoramaOptions);
}

function showMap(params) {

    MapTrack = Helper.createMap({ target: 'map', latLng: [params.lat, params.lng], zoom: 15 });

    window.PosMarker[window.TargetAsset.IMEI].addTo(MapTrack);


    if (!StreetViewService) {
        StreetViewService = new google.maps.StreetViewService();
    }
}

function setAssetList(list) {
    //localStorage.setItem("COM.QUIKTRAK.LIVE.ASSETLIST", JSON.stringify(list));
    var ary = {};
    for (var i = 0; i < list.length; i++) {
        ary[list[i]["IMEI"]] = {
            Name: list[i]["Name"],
            IMEI: list[i]["IMEI"],
            IMSI: list[i]["IMSI"],
            Photo: list[i]["Photo"],
            Product: list[i]["Product"],
            Describe1: list[i]["Describe1"],
            Describe2: list[i]["Describe2"],
            Describe3: list[i]["Describe3"],
            Describe4: list[i]["Describe4"],
            Alias: list[i]["Alias"],
            StatusNew: list[i]["StatusNew"],
            AlarmOptions: list[i]["AlarmOptions"],
            AppPhoto: getAssetIcoSrc(list[i]["IMEI"]),
        };

    }
    //console.log(ary);
    localStorage.setItem("COM.QUIKTRAK.LIVE.ASSETLIST", JSON.stringify(ary));
}

function updateAssetList(asset) {
    var list = getAssetList();
    //var oldAssetData = list[asset.IMEI];
    list[asset.IMEI] = asset;
    //list[asset.IMEI]["AppPhoto"]=oldAssetData.AppPhoto;
    localStorage.setItem("COM.QUIKTRAK.LIVE.ASSETLIST", JSON.stringify(list));
}

function getAssetList() {
    var ret = null;
    var str = localStorage.getItem("COM.QUIKTRAK.LIVE.ASSETLIST");
    if (str) { ret = JSON.parse(str); }
    return ret;
}

function updateAlarmOptVal(alarmOptions) {
    var IMEIList = alarmOptions.IMEI.split(',');
    var assetList = getAssetList();

    if (IMEIList) {
        $.each(IMEIList, function(index, value) {
            assetList[value].AlarmOptions = alarmOptions.options;
        });
    }

    localStorage.setItem("COM.QUIKTRAK.LIVE.ASSETLIST", JSON.stringify(assetList));
}

function setAlarmList(options) {
    var list = getAlarmList();
    if (!list) {
        list = {};
    }
    list[options.IMEI] = {
        IMEI: options.IMEI,
        Alarm: options.Alarm,
        Geolock: options.Geolock,
        Tilt: options.Tilt,
        Impact: options.Impact,
        Power: options.Power
    };
    console.log(list);

    localStorage.setItem("COM.QUIKTRAK.LIVE.ALARMLIST", JSON.stringify(list));
}



function getAlarmList() {
    var ret = null;
    var str = localStorage.getItem("COM.QUIKTRAK.LIVE.ALARMLIST");
    if (str) { ret = JSON.parse(str); }
    return ret;
}


// записывем новые картинки
function setAssetImg(assetImg) {
    var list = getAssetImgList();
    if (!list) {
        list = {};
    }
    list[assetImg.IMEI] = {
        IMEI: assetImg.IMEI,
        src: assetImg.src
    };
    localStorage.setItem("COM.QUIKTRAK.LIVE.ASSETIMGLIST", JSON.stringify(list));
}


// тянем с LocalStorage картинки
function getAssetImgList() {
    var ret = null;
    var str = localStorage.getItem("COM.QUIKTRAK.LIVE.ASSETIMGLIST");
    if (str) {
        ret = JSON.parse(str);
    }
    return ret;
}



// берем адресс картинок
function getAssetImgSrc(asset) {
    var assetImgList = getAssetImgList();
    var ret;
    var pattern = /^IMEI_/i;
    if (assetImgList) {
        var assetImg = assetImgList[asset];
        if (assetImg) {
            ret = assetImg['src'];
        }
    }
    if (!ret) {
        var assetList = getAssetList();
        var assetInfo = assetList[asset];

        if (assetInfo && assetInfo.Photo && pattern.test(assetInfo.Photo)) {
            ret = 'https://upload.quiktrak.co/Attachment/images/' + assetInfo.Photo + '?v=' + new Date().getTime();
        }

    }
    if (!ret) {
        ret = 'resources/images/svg_add_photo_general.svg';
    }
    return ret;
}

// assetImg = '<img class="item_asset_img" src="http://upload.quiktrak.co/Attachment/images/' + params.Icon + '?' + new Date().getTime() + 'alt="">';

function getAssetIcoSrc(asset) {
    var assetImgList = getAssetImgList();
    // var ret = 'resources/images/svg_asset.svg';
    var ret;
    var pattern = /^IMEI_/i;
    if (assetImgList) {
        var assetImg = assetImgList[asset];
        if (assetImg) {
            ret = assetImg['src'];
        }
    }
    if (!ret) {
        var assetList = getAssetList();
        if (assetList) {
            var assetInfo = assetList[asset];
            //console.log(assetInfo)
            if (assetInfo && assetInfo.Photo && pattern.test(assetInfo.Photo)) {
                ret = 'https://upload.quiktrak.co/Attachment/images/' + assetInfo.Photo + '?v=' + new Date().getTime();
            }
        }
    }
    if (!ret) {
        ret = 'resources/images/svg_asset.svg';
    }
    return ret;
}

function setGeolock(object) {
    var list = getGeolockList();
    if (!list) {
        list = {};
    }
    list[object.IMEI] = {
        IMEI: object.IMEI,
        state: object.state
    };
    localStorage.setItem("COM.QUIKTRAK.LIVE.GEOLOCKLIST", JSON.stringify(list));
}

function getGeolockList() {
    var ret = null;
    var str = localStorage.getItem("COM.QUIKTRAK.LIVE.GEOLOCKLIST");
    if (str) { ret = JSON.parse(str); }
    return ret;
}

function checkBalanceAndLoadPage(pageName) {
    if (pageName) {
        var userInfo = getUserinfo();
        var url = API_URL.URL_GET_BALANCE.format(userInfo.MajorToken, userInfo.MinorToken);

        JSON1.request(url, function(result) {
                if (result.MajorCode == '000') {
                    userInfo.UserInfo.SMSTimes = result.Data.SMSTimes;
                    setUserinfo(userInfo);
                    if (result.Data.SMSTimes < 1) {
                        showNoCreditMessage();
                    } else {
                        switch (pageName) {
                            case 'asset.alarm':
                                loadPageAssetAlarm();
                                break;
                            case 'alarms.assets':
                                mainView.router.load({
                                    url: 'resources/templates/alarms.assets.html',
                                });
                                break;
                        }

                        updateUserCrefits(result.Data.SMSTimes);
                    }

                }
            },
            function() {});
    }
}

function showNoCreditMessage() {
    var modalTex = '<div class="color-red custom-modal-title">' + LANGUAGE.PROMPT_MSG027 + '</div>' +
        '<div class="custom-modal-text">' + LANGUAGE.PROMPT_MSG004 + '</div>';
    App.modal({
        title: '<img class="custom-modal-logo" src="resources/images/login_logo.png" alt=""/>',
        text: modalTex,
        buttons: [{
                text: LANGUAGE.COM_MSG20
            },
            {
                text: LANGUAGE.COM_MSG19,
                //bold: true,
                onClick: function() {
                    recharge();
                }
            },
        ]
    });
}

function showModalMessage(header, body) {
    var modalTex = '<div class="color-red custom-modal-title">' + header + '</div>' +
        '<div class="custom-modal-text">' + body + '</div>';
    App.modal({
        title: '<img class="custom-modal-logo" src="resources/images/login_logo.png" alt=""/>',
        text: modalTex,
        buttons: [{
                text: LANGUAGE.COM_MSG31
            },

        ]
    });
}

function loadPageAssetAlarm() {
    var assetList = getAssetList();
    var asset = assetList[TargetAsset.IMEI];
    var assetAlarmVal = assetList[TargetAsset.IMEI].AlarmOptions;
    var alarms = {
        alarm: {
            state: true,
            //val: 0,
        },
        geolock: {
            state: true,
            val: 1024,
        },
        tilt: {
            state: true,
            val: 256,
        },
        impact: {
            state: true,
            val: 16384,
        },
        power: {
            state: true,
            val: 4,
        },
        input: {
            state: true,
            val: 131072,
        },
        accOff: {
            state: true,
            val: 65536,
        },
        accOn: {
            state: true,
            val: 32768,
        },
        lowBattery: {
            state: true,
            val: 512,
        },
        NegativeInput: {
            state: true,
            val: 131072,
        },
    };
    if (assetAlarmVal) {
        $.each(alarms, function(key, value) {
            if (assetAlarmVal & value.val) {
                alarms[key].state = false;
            }
        });
        if (assetAlarmVal == 247556) {
            alarms.alarm.state = false;
        }

    }
    mainView.router.load({
        url: 'resources/templates/asset.alarm.html',
        context: {
            Name: asset.Name,
            Alarm: alarms.alarm.state,
            Geolock: alarms.geolock.state,
            Tilt: alarms.tilt.state,
            Impact: alarms.impact.state,
            Power: alarms.power.state,
            Input: alarms.input.state,
            AccOff: alarms.accOff.state,
            AccOn: alarms.accOn.state,
            LowBattery: alarms.lowBattery.state,
            NegativeInput: alarms.NegativeInput.state,
        }
    });
}

function loadPageSupport() {
    var userInfo = getUserinfo().UserInfo;

    var param = {
        'name': '',
        'loginName': '',
        'email': '',
        'phone': '',
        'service': '3', //means quikloc8.co in support page
    };

    if (userInfo.FirstName) {
        param.name = userInfo.FirstName.trim();
    }
    if (userInfo.SurName) {
        param.name = param.name + ' ' + userInfo.SurName.trim();
        param.name = param.name.trim();
    }
    if (localStorage.ACCOUNT) {
        param.loginName = localStorage.ACCOUNT.trim();
        param.loginName = encodeURIComponent(param.loginName);
    }
    if (userInfo.Email) {
        param.email = userInfo.Email.trim();
        param.email = encodeURIComponent(param.email);
    }
    if (userInfo.Mobile) {
        param.phone = userInfo.Mobile.trim();
        param.phone = encodeURIComponent(param.phone);
    }
    if (param.name) {
        param.name = encodeURIComponent(param.name);
    }

    //API_URL.URL_SUPPORT = "http://support.quiktrak.eu/?name={0}&loginName={1}&email={2}&phone={3}";
    //var href = API_URL.URL_SUPPORT;
    var href = API_URL.URL_SUPPORT.format(param.name, param.loginName, param.email, param.phone, param.service);

    if (typeof navigator !== "undefined" && navigator.app) {
        navigator.app.loadUrl(href, { openExternal: true });
    } else {
        window.open(href, '_blank');
    }
}

function getNewNotifications(params) {


    var userInfo = getUserinfo();
    var MinorToken = !userInfo ? '' : userInfo.MinorToken;
    var deviceToken = !localStorage.PUSH_DEVICE_TOKEN ? '' : localStorage.PUSH_DEVICE_TOKEN;

    if (MinorToken && deviceToken) {
        var container = $$('body');
        if (container.children('.progressbar, .progressbar-infinite').length) return; //don't run all this if there is a current progressbar loading
        App.showProgressbar(container);

        localStorage.notificationChecked = 0;
        var url = API_URL.URL_GET_NEW_NOTIFICATIONS.format(MinorToken, encodeURIComponent(deviceToken));

        JSON1.request(url, function(result) {
                App.hideProgressbar();
                localStorage.notificationChecked = 1;
                if (params && params.ptr === true) {
                    App.pullToRefreshDone();
                }


                console.log(result);
                if (result.MajorCode == '000') {
                    var data = result.Data;
                    if (Array.isArray(data) && data.length > 0) {
                        setNotificationList(result.Data);

                        var page = App.getCurrentView().activePage;
                        if (page && page.name != "notification") {
                            $$('.notification_button').addClass('new_not');
                        } else {
                            var messageList = setCurrentTimezone(result.Data);
                            showNotification(messageList);
                        }
                    }

                    if (params && params.loadPageNotification === true) {
                        var user = localStorage.ACCOUNT;
                        var notList = getNotificationList();

                        if (notList && notList[user] && notList[user].length > 0 || Array.isArray(data) && data.length > 0) {
                            mainView.router.load({
                                url: 'resources/templates/notification.html',
                            });
                            $$('.notification_button').removeClass('new_not');
                        } else {
                            App.addNotification({
                                hold: 3000,
                                message: LANGUAGE.PROMPT_MSG017
                            });
                        }
                    }

                } else {
                    console.log(result);
                }

            },
            function() {
                App.hideProgressbar();
                localStorage.notificationChecked = 1;
            }
        );
    }

}



function setCurrentTimezone(messageList) {
    var newMessageList = [];
    var msg = null;
    if (Array.isArray(messageList)) {
        for (var i = 0; i < messageList.length; i++) {
            msg = null;
            if (messageList[i].payload) {
                msg = isJsonString(messageList[i].payload);
                if (!msg) {
                    msg = messageList[i].payload;
                }
            } else {
                msg = isJsonString(messageList[i]);
                if (!msg) {
                    msg = messageList[i];
                }
            }
            if (msg) {
                if (msg.PositionTime) {
                    localTime = moment.utc(msg.PositionTime).toDate();
                    msg.PositionTime = moment(localTime).format(window.COM_TIMEFORMAT);
                }
                if (msg.time) {
                    localTime = moment.utc(msg.time).toDate();
                    msg.time = moment(localTime).format(window.COM_TIMEFORMAT);
                }
                if (msg.CreateDateTime) {
                    localTime = moment.utc(msg.CreateDateTime).toDate();
                    msg.CreateDateTime = moment(localTime).format(window.COM_TIMEFORMAT);
                }
                newMessageList.push(msg);
            }
        }
    }
    return newMessageList;
}

function getStatusNewState(params) {
    var res = '';
    if (params.asset && params.changeState && params.changeState.name && params.changeState.state) {
        switch (params.changeState.name) {
            case 'geolock':
                if (params.changeState.state == 'on') {
                    if (parseInt(params.asset.StatusNew) === 0) {
                        params.asset.StatusNew = 1;
                    } else if (parseInt(params.asset.StatusNew) === 2) {
                        params.asset.StatusNew = 3;
                    }
                } else {
                    if (parseInt(params.asset.StatusNew) === 1) {
                        params.asset.StatusNew = 0;
                    } else if (parseInt(params.asset.StatusNew) === 3) {
                        params.asset.StatusNew = 2;
                    }
                }
                break;
            case 'immob':
                if (params.changeState.state == 'on') {
                    if (parseInt(params.asset.StatusNew) === 0) {
                        params.asset.StatusNew = 2;
                    } else if (parseInt(params.asset.StatusNew) === 1) {
                        params.asset.StatusNew = 3;
                    }
                } else {
                    if (parseInt(params.asset.StatusNew) === 2) {
                        params.asset.StatusNew = 0;
                    } else if (parseInt(params.asset.StatusNew) === 3) {
                        params.asset.StatusNew = 1;
                    }
                }
                break;
        }
        res = params.asset;
    }
    return res;
}

function getStatusNewState2(params) {
    var res = '';
    if (params && params.asset && params.changeState && params.changeState.state) {
        if (params.changeState.state == 'on' || params.changeState.state == 'lock') {
            params.asset.StatusNew = parseInt(params.asset.StatusNew) | Helper.StatusNewEnum[params.changeState.name];
        } else {
            params.asset.StatusNew = parseInt(params.asset.StatusNew) & ~Helper.StatusNewEnum[params.changeState.name];
        }
        res = params.asset;
    }
    return res;
}

function removeNotificationListItem(index) {
    var list = getNotificationList();
    var user = localStorage.ACCOUNT;

    list[user].splice(index, 1);
    localStorage.setItem("COM.QUIKTRAK.LIVE.NOTIFICATIONLIST", JSON.stringify(list));
    var existLi = $$('.notification_list li');
    index = existLi.length - 2;
    existLi.each(function() {
        var currentLi = $$(this);
        if (!currentLi.hasClass('deleting')) {
            currentLi.attr('data-id', index);
            index--;
        }
    });
    virtualNotificationList.clearCache();
    //virtualNotificationList.update();
}

function removeAllNotifications() {
    var list = getNotificationList();
    var user = localStorage.ACCOUNT;
    list[user] = [];
    localStorage.setItem("COM.QUIKTRAK.LIVE.NOTIFICATIONLIST", JSON.stringify(list));
    virtualNotificationList.deleteAllItems();
}
/*function setNotificationList(list){
    var pushList = getNotificationList();
    var user = localStorage.ACCOUNT;
    if (pushList) {
        if (!pushList[user]) {
            pushList[user] = [];
        }
    }else{
        pushList = {};
        pushList[user] = [];
    }
    if (Array.isArray(list)) {
        for (var i = 0; i < list.length; i++) {
            var msg = null;
            if (list[i].payload) {
                 msg = isJsonString(list[i].payload);
                if (!msg) {
                    msg = list[i].payload;
                }
            }else if(list[i]){
                msg = isJsonString(list[i]);
                if (!msg) {
                    msg = list[i];
                }
            }
            if (msg && msg.alarm ) {
                if (msg.alarm == "status") {
                    msg.StatusTime = moment().format(window.COM_TIMEFORMAT);
                }else{
                    if (msg.PositionTime) {
                        var localTime  = moment.utc(msg.PositionTime).toDate();
                        msg.PositionTime = moment(localTime).format(window.COM_TIMEFORMAT);
                    }else if (msg.positionTime) {
                        var localTime  = moment.utc(msg.positionTime).toDate();
                        msg.positionTime = moment(localTime).format(window.COM_TIMEFORMAT);
                    }
                }
                if (msg.alarm == "geolock" || msg.alarm == "move") {
                    var assetList = getAssetList();
                    var asset = null;
                    if (msg.imei) {
                        asset = assetList[msg.imei];
                    }
                    if (asset) {
                        asset.Geolock = false;
                        updateAssetList(asset);
                        setGeolock({IMEI:asset.IMEI,state:asset.Geolock});
                    }
                }
                pushList[user].push(msg);
            }
        }
    }
    localStorage.setItem("COM.QUIKTRAK.LIVE.NOTIFICATIONLIST", JSON.stringify(pushList));
}
*/
function setNotificationList(list) {
    var pushList = getNotificationList();
    var user = localStorage.ACCOUNT;
    if (pushList) {
        if (!pushList[user]) {
            pushList[user] = [];
        }
    } else {
        pushList = {};
        pushList[user] = [];
    }
    var assetList = getAssetList();
    var msg = null;
    var localTime = null;
    var popped = null;
    var isPoppedJson = null;
    var asset = null;
    if (Array.isArray(list)) {
        for (var i = 0; i < list.length; i++) {
            msg = null;
            localTime = null;
            popped = null;
            isPoppedJson = null;
            asset = null;
            if (list[i].payload) {
                msg = isJsonString(list[i].payload);
                if (!msg) {
                    msg = list[i].payload;
                }
            } else if (list[i]) {
                msg = isJsonString(list[i]);
                if (!msg) {
                    msg = list[i];
                }
            }
            if (msg) {
                if (msg.PositionTime) {
                    localTime = moment.utc(msg.PositionTime).toDate();
                    msg.PositionTime = moment(localTime).format(window.COM_TIMEFORMAT);
                }
                if (msg.time) {
                    localTime = moment.utc(msg.time).toDate();
                    msg.time = moment(localTime).format(window.COM_TIMEFORMAT);
                }
                if (msg.CreateDateTime) {
                    localTime = moment.utc(msg.CreateDateTime).toDate();
                    msg.CreateDateTime = moment(localTime).format(window.COM_TIMEFORMAT);
                }

                if (msg.alarm && msg.alarm == "geolock" || msg.alarm && msg.alarm == "move") {
                    if (msg.imei) {
                        asset = assetList[msg.imei];
                        if (asset) {
                            //getNewAssetInfo({'id':asset.Id});
                            if (parseInt(asset.StatusNew) === 1) {
                                asset.StatusNew = 0;
                            } else if (parseInt(asset.StatusNew) === 3) {
                                asset.StatusNew = 2;
                            }
                            updateAssetList(asset);

                        }
                    }
                }

                popped = pushList[user].pop();
                if (popped) {
                    isPoppedJson = isJsonString(popped);
                    if (isPoppedJson) {
                        popped = isPoppedJson;
                    }
                    popped = JSON.stringify(popped);
                    msg = JSON.stringify(msg);
                    if (popped != msg) {
                        popped = JSON.parse(popped);
                        pushList[user].push(popped);
                    }
                }

                pushList[user].push(msg);
            }
        }
    }
    localStorage.setItem("COM.QUIKTRAK.LIVE.NOTIFICATIONLIST", JSON.stringify(pushList));
}

function getNotificationList() {
    var ret = {};
    var str = localStorage.getItem("COM.QUIKTRAK.LIVE.NOTIFICATIONLIST");
    if (str) { ret = JSON.parse(str); }
    return ret;
}

function clearNotificationList() {
    var list = getNotificationList();
    var user = localStorage.ACCOUNT;
    if (list) {
        list[user] = [];
    }
    localStorage.setItem("COM.QUIKTRAK.LIVE.NOTIFICATIONLIST", JSON.stringify(list));
}

/*function showNotification(list){
    var data = null;
    var localTime = null;
    var isJson = '';
    if (list) {
        for (var i = 0; i < list.length; i++) {
            localTime = null;
            data = null;
            isJson = '';
            if (list[i].payload) {
                isJson = isJsonString(list[i].payload);
                if (isJson) {
                    data = isJson;
                }else{
                    data = list[i].payload;
                }
            }else if(list[i]){
                isJson = isJsonString(list[i]);
                if (isJson) {
                    data = isJson;
                }else{
                    data = list[i];
                }
            }
            if (data) {
                var index = $('.notification_list li').first().data('id');
                if (typeof index == "undefined") {
                    data.listIndex = 0;
                }else{
                    index = index+1;
                    data.listIndex = index;
                }

                if (data.PositionTime) {
                    data.PositionTime = data.PositionTime.replace("T", " ");
                }
                //console.log(data);
                data.alarm = toTitleCase(data.alarm);
                virtualNotificationList.prependItem(data);
            }
        }
    }
}*/
function showNotification(list) {
    var data = null;
    var isJson = '';
    var newList = [];
    var index = parseInt($('.notification_list li').first().data('id'));
    if (list) {
        for (var i = 0; i < list.length; i++) {
            data = null;
            isJson = '';
            if (list[i].payload) {
                isJson = isJsonString(list[i].payload);
                if (isJson) {
                    data = isJson;
                } else {
                    data = list[i].payload;
                }
            } else if (list[i]) {
                isJson = isJsonString(list[i]);
                if (isJson) {
                    data = isJson;
                } else {
                    data = list[i];
                }
            }
            if (data) {
                if (isNaN(index)) {
                    index = 0;
                } else {
                    index++;
                }
                data.listIndex = index;

                if (data.PositionTime) {
                    data.PositionTime = data.PositionTime.replace("T", " ");
                }
                if (data.time) {
                    data.time = data.time.replace("T", " ");
                }
                if (data.CreateDateTime) {
                    data.CreateDateTime = data.CreateDateTime.replace("T", " ");
                }
                //console.log(data);
                if (data.alarm) {
                    data.alarm = toTitleCase(data.alarm);
                }
                //console.log(data);

                newList.unshift(data);
            }
        }
        console.log(virtualNotificationList);
        console.log(newList);
        if (virtualNotificationList && newList.length !== 0) {
            virtualNotificationList.prependItems(newList);
        }
    }
}


function processClickOnPushNotification(msgJ) {
    //console.log(msgJ);
    if (Array.isArray(msgJ)) {
        var msg = null;
        if (msgJ[0].payload) {
            msg = isJsonString(msgJ[0].payload);
            if (!msg) {
                msg = msgJ[0].payload;
            }
        } else {
            msg = isJsonString(msgJ[0]);
            if (!msg) {
                msg = msgJ[0];
            }
        }

        var localTime = '';
        if (msg && msg.time) {
            localTime = moment.utc(msg.time).toDate();
            msg.time = moment(localTime).format(window.COM_TIMEFORMAT);
        }
        if (msg && msg.PositionTime) {
            localTime = moment.utc(msg.PositionTime).toDate();
            msg.PositionTime = moment(localTime).format(window.COM_TIMEFORMAT);
        }
        if (msg && msg.CreateDateTime) {
            localTime = moment.utc(msg.CreateDateTime).toDate();
            msg.CreateDateTime = moment(localTime).format(window.COM_TIMEFORMAT);
        }

        //console.log(msg);
        if (msg && msg.alarm && msg.alarm.toLowerCase() == 'status') {
            loadStatusPage(msg);
        } else if (msg && parseFloat(msg.lat) && parseFloat(msg.lat) || msg && parseFloat(msg.Lat) && parseFloat(msg.Lat)) {

            loadPositionPage(msg);
        } else {
            var activePage = App.getCurrentView().activePage;
            if (typeof(activePage) == 'undefined' || (activePage && activePage.name != "notification")) {
                mainView.router.loadPage('resources/templates/notification.html');
            } else {
                mainView.router.refreshPage();
            }
        }

    }
}

function checkMapExisting() {
    if ($$('#map')) {
        $$('#map').remove();
        MapTrack = null;
    }
}

function showMsgNotification(arrMsgJ) {
    if (Array.isArray(arrMsgJ)) {
        var msg = null;
        if (arrMsgJ[0].payload) {
            msg = isJsonString(arrMsgJ[0].payload);
            if (!msg) {
                msg = arrMsgJ[0].payload;
            }
        } else {
            msg = isJsonString(arrMsgJ[0]);
            if (!msg) {
                msg = arrMsgJ[0];
            }
        }

        if (msg && msg.alarm && msg.AssetName) {
            var message = msg.AssetName + '</br>' + msg.alarm;
            App.addNotification({
                hold: 5000,
                message: message,
                button: {
                    text: LANGUAGE.COM_MSG09,
                    close: false,
                },
                onClick: function() {
                    App.closeNotification('.notifications');
                    $$('.notification_button').removeClass('new_not');
                    processClickOnPushNotification(arrMsgJ);
                },
            });

        }
    }
}

function updateUserCrefits(credits) {
    $$('body .user_credits').html(credits);

    setTimeout(function() {
        checkIsBalanceLow(credits);
    }, 1000);

}

function balance() {
    var userInfo = getUserinfo();
    var url = API_URL.URL_GET_BALANCE.format(userInfo.MajorToken, userInfo.MinorToken);

    JSON1.request(url, function(result) {
            //console.log(result);
            if (result.MajorCode == '000') {
                userInfo.UserInfo.SMSTimes = result.Data.SMSTimes;
                setUserinfo(userInfo);
                updateUserCrefits(result.Data.SMSTimes);
                //$$('body .user_credits').html(result.Data.SMSTimes);
            }
        },
        function() {}
    );
}

function afterRechergeCredits() {
    App.showPreloader();
    var userInfo = getUserinfo();
    var url = API_URL.URL_GET_BALANCE.format(userInfo.MajorToken, userInfo.MinorToken);
    JSON1.request(url, function(result) {
            //console.log(result);
            if (result.MajorCode == '000') {
                userInfo.UserInfo.SMSTimes = result.Data.SMSTimes;
                setUserinfo(userInfo);
                updateUserCrefits(result.Data.SMSTimes);
                //$$('body .user_credits').html(result.Data.SMSTimes);
                var text = 'Your Remaining: ' + result.Data.SMSTimes;
                App.alert(text);
            }
            App.hidePreloader();
        },
        function() {
            App.hidePreloader();
            App.alert('Network Error');
        }
    );
}

function initSearchbar() {
    if (searchbar) {
        searchbar.destroy();
    }
    searchbar = App.searchbar('.searchbar', {
        searchList: '.list-block-search',
        searchIn: '.item-title',
        found: '.searchbar-found',
        notFound: '.searchbar-not-found',
        onDisable: function(s) {
            $(s.container).slideUp();
            // $$(s.container).removeClass('fadeInDown').addClass('fadeOutUp').hide();

        }
    });
}

function sendCommand(command, imsis){

    if (!imsis) {
        //self.methods.customDialog({title: LANGUAGE.PROMPT_MSG057, text: LANGUAGE.PROMPT_MSG078});
        showModalMessage(LANGUAGE.PROMPT_MSG057, LANGUAGE.PROMPT_MSG059);
        return;
    }
    if (!command) {
        //self.methods.customDialog({title: LANGUAGE.PROMPT_MSG057, text: LANGUAGE.PROMPT_MSG080});
        showModalMessage(LANGUAGE.PROMPT_MSG057, LANGUAGE.PROMPT_MSG058);
        return;
    }
    var userInfo = getUserinfo();
    let data = {
        MinorToken: userInfo.MinorToken,
        appToken: localStorage.PUSH_APPID_ID,
        imsis: imsis,
    };
    App.showPreloader();
    JSON1.requestPost(command, data, function(result) {
        console.log(result);
        App.hidePreloader();

        if(result.MajorCode === '000') {
            App.addNotification({
                hold: 3000,
                message: LANGUAGE.COM_MSG03
            });
            balance();
        }else if(result.MajorCode === '200' && result.MinorCode === '1003'){
            //self.methods.customDialog({title: LANGUAGE.PROMPT_MSG039, text: LANGUAGE.PROMPT_MSG040});
            showModalMessage(LANGUAGE.PROMPT_MSG057, LANGUAGE.PROMPT_MSG031);
        }else if(result.MajorCode === '100' && result.MinorCode === '1003'){
            //self.methods.customDialog({title: LANGUAGE.PROMPT_MSG039, text: LANGUAGE.PROMPT_MSG040});
            showModalMessage(LANGUAGE.PROMPT_MSG057, LANGUAGE.PROMPT_MSG031);
        }else{
            //self.methods.customDialogNoCredit();
            showNoCreditMessage();
        }

    }, function(result) {
        App.hidePreloader();
        App.alert(LANGUAGE.COM_MSG02);
    });
}


/* ASSET EDIT PHOTO */

var cropper = null;
var resImg = null;

function initCropper() {
    var image = document.getElementById('image');
    //alert(image);
    cropper = new Cropper(image, {
        aspectRatio: 1 / 1,
        dragMode: 'move',
        rotatable: true,
        minCropBoxWidth: 200,
        minCropBoxHeight: 200,
        minCanvasWidth: 200,
        minCanvasHeight: 200,
        minContainerWidth: 200,
        minContainerHeight: 200,
        crop: function(data) {}
    });

}

// function createLocal() {
//     var list = {
//         324445564545: {
//             IMEI: 324445564545,
//             src: 'url/images1'
//         },
//         945409540800: {
//             IMEI: 945409540800,
//             src: 'url/images2'
//         }
//     }
//     localStorage.setItem("COM.QUIKTRAK.LIVE.ASSETIMGLIST", JSON.stringify(list));
// }
// createLocal();


function deleteOldImg(asset) {
    var assetImgList = getAssetImgList();

    if (assetImgList) {
        var assetItem = assetImgList[asset];
        if (assetItem) {
            delete assetImgList[asset];
            localStorage.setItem("COM.QUIKTRAK.LIVE.ASSETIMGLIST", JSON.stringify(assetItem));
        }
    }


}



function saveImg() {
    resImg = cropper.getCroppedCanvas({
        width: 200,
        height: 200
    }).toDataURL();

    $$('.asset_img img').attr('src', resImg);

    var page = App.getCurrentView().activePage;
    if (page.name == "asset" || page.name == "asset.edit") {
        if (TargetAsset.IMEI) {
            $$('.assets_list li[data-id="' + TargetAsset.IMEI + '"] .item-media img').attr('src', resImg);
            // var assetList = getAssetList();
            // var asset = assetList[TargetAsset.IMEI];
            // asset.Photo = resImg;
            // updateAssetList(asset);
            // deleteOldImg(TargetAsset.IMEI);
        }
    }

    var assetImg = {
        id: 'IMEI_' + TargetAsset.IMEI,
        data: resImg,
    };



    $.ajax({
        type: 'POST',
        url: API_URL.URL_PHOTO_UPLOAD,
        data: assetImg,
        async: true,
        cache: false,
        crossDomain: true,
        success: function(result) {
            App.hidePreloader();
            result = typeof(result) == 'string' ? eval("(" + result + ")") : result;
            if (result.MajorCode == "000") {
                TargetAsset.IMG = result.Data;
            } else {
                App.alert('Something wrong. Photo not saved');
            }
            mainView.router.back();
        },
        error: function(XMLHttpRequest, textStatus, errorThrown) {
            App.hidePreloader();
            App.alert(LANGUAGE.COM_MSG02);
        }
    });

}





function getImage(source) {

    if (!navigator.camera) {
        alert("Camera API not supported", "Error");

    } else {
        var options = {
            quality: 50,
            destinationType: Camera.DestinationType.DATA_URL,
            sourceType: source, // 0:Photo Library, 1=Camera, 2=Saved Album
            encodingType: 0 // 0=JPG 1=PNG
        };

        navigator.camera.getPicture(
            function(imgData) {
                //$('.media-object', this.$el).attr('src', "data:image/jpeg;base64,"+imgData);
                mainView.router.load({
                    url: 'resources/templates/asset.edit.photo.html',
                    context: {
                        imgSrc: "data:image/jpeg;base64," + imgData
                            //imgSrc: base4
                    }
                });

            },
            function() {
                //alert('Error taking picture', 'Error');
            },
            options);
    }
}