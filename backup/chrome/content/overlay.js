var configFileName = "backupMail.conf"; //コンフィグファイル名は決め打ち
var configFlagAcc  = false;  //アカウント指定がある場合true
var configFlagAddr = false;  //アドレス指定がある場合true

var hashAccount = new Array();
var hashAddress = new Array();

var myPanel;
var path;

//<..@..>から..@..だけ抜き出し
function chompUrl( url ){
    let s = url.indexOf("<");
    if( s < 0 ){
	return url;
    }  
    let e = url.indexOf(">");
    if( e < 0 ){
	return url;
    }
    let v = url.substring(s+1,e).trim();
    return v;
}

function msgHdrGetUri (aMsg) {
    return aMsg.folder.getUriForMsg(aMsg)
}

function getMsgHdr(aMsgHdr, k){
    let uri = msgHdrGetUri(aMsgHdr);
    let messenger = Components.classes["@mozilla.org/messenger;1"]
        .createInstance(Components.interfaces.nsIMessenger);
    let messageService = messenger.messageServiceFromURI(uri);
    
    let fallback = function ()
    MsgHdrToMimeMessage(aMsgHdr, null, function (aMsgHdr, aMimeMsg) {
	k(aMimeMsg);
    }, true, {
	partsOnDemand: true,
    });

  // This is intentionally disabled because there's a bug in Thunderbird that
  // renders the supposedly-useful streamHeaders function unusable.
    if (false && "streamHeaders" in messageService) {
	try {
	    messageService.streamHeaders(uri, createStreamListener(function (aRawString) {
		let re = /\r?\n\s+/g;
		let str = aRawString.replace(re, " ");
		let lines = str.split(/\r?\n/);
		let obj = {};
		for each (let [, line] in Iterator(lines)) {
		    let i = line.indexOf(":");
		    if (i < 0)
			continue;
		    let k = line.substring(0, i).toLowerCase();
		    let v = line.substring(i+1).trim();
		    if (!(k in obj))
			obj[k] = [];
		    obj[k].push(v);
		}
		k(new HeaderHandler(obj));
	    }), null, true);
	} catch (e) {
	    fallback();
	}
    } else {
	fallback();
    }
}

function getHeader(MsgBody, Header){
   
}

function getFrom(MsgBody){

}

function getDeliverdTo(MsgBody){

}

function getCC(MsgBody){

}

function getBCC(MsbBody){

}

function getConfigFile(){
    configFlagAcc = false;
    configFlagAddr= false;

    Components.utils.import("resource://gre/modules/FileUtils.jsm");
    Components.utils.import("resource://gre/modules/NetUtil.jsm");

    //Preferencesから保存先ディレクトリ読み出し
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefService).getBranch("extensions.backup.");
    var value = prefs.getCharPref("stringpref");

    var file    = new FileUtils.File(value + configFileName);

    //コンフィグファイルがなければ何もしない
    if( !file.exists() ){
	Application.console.log("can't find config file");
	return;
    }
    
    NetUtil.asyncFetch(file, function(inputStream, status) {
	if (!Components.isSuccessCode(status)) {
	    // Handle error!
	    Application.console.log("error read file");
	    return;
	}
 
	// The file data is contained within inputStream.
	// You can read it into a string with
	var data = NetUtil.readInputStreamToString(inputStream, inputStream.available());
	
	//コンフィグファイルから設定読み出し：メールアカウント設定
	var array = data.split(/\r\n|\r|\n/);
	if( array.length > 0 ){
	    for( var i = 0; i < array.length; i++ ){
		if( array[i].match(/(account:)(.+)/) ) {
		    hashAccount[RegExp.$2.trim()] = true;
		    configFlagAcc = true;
		}else if( array[i].match(/(address:)(.+)/)) {
		    hashAddress[RegExp.$2.trim()] = true;	
		    configFlagAddr= true;
		}
	    }
	}else{
	    Application.console.log("config error");
	}
	return;
    });
    return;
}

//保存先ディレクトリのチェック、作成、パス名リターン
//フォルダが移動、日付が変わる可能性があるため、
//都度チェックするようにする。
function checkAndgetDir(){
    Components.utils.import("resource://gre/modules/FileUtils.jsm");
    Components.utils.import("resource://gre/modules/NetUtil.jsm");

    //Preferencesから保存先ディレクトリ読み出し
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefService).getBranch("extensions.backup.");
    var value = prefs.getCharPref("stringpref");
    
    var dir    = new FileUtils.File(value);
    
    //コンフィグ指定の保存先dir存在チェック
    if( !dir.exists() ){
	myPanel.label = "Create basedir";
	dir.create(1,0777);
    }
    if( !dir.isDirectory() ){
	myPanel.label = "basedir is file";		
	return "";
    }
	    
    //dirがあれば日付ディレクトリチェック＋作成
    dd = new Date();
    yy = dd.getYear();
    mm = dd.getMonth() + 1;
    dd = dd.getDate();
    if (yy < 2000) { yy += 1900; }
    if (mm < 10) { mm = "0" + mm; }
    if (dd < 10) { dd = "0" + dd; }
    dir.append( yy+""+mm+""+dd);
    
    if( !dir.exists() ){
	myPanel.label = "Create dir";
	dir.create(1,0777);
    }

    if( !dir.isDirectory() ){
	myPanel.label = "dir is file";		
	return "";
    }

    return dir;    
}

//保存する際のファイル名指定。現状messageidを利用している。
//なので、ファイル名からは内容が推測しにくい
//件名をファイル名にすると重複が予想されるため、messageidを利用
function getFileName( aMsgHdr ){
    return aMsgHdr.messageId + ".eml";
}

//メール保存処理
function saveMail(aMsgHdr){
	    let messenger = Components.classes["@mozilla.org/messenger;1"].createInstance(Components.interfaces.nsIMessenger);
	    var mailSaveListener = { messageID: "",
				     OnStartRunningUrl: function(url){},
				     OnStopRunningUrl : function(url, exitCode ){
					 if(exitCode == 0){
					     //mail saved
					     myPanel.label = "Mail saved.";    
					 }else{
					     myPanel.label = "Mail save error";    
					 }
				     }
				   };

	    let uri = aMsgHdr.folder.getUriForMsg(aMsgHdr);

	    var filestr= getFileName(aMsgHdr);
	    path.append(filestr);
            var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
            var outuri = ioService.newFileURI(path);

	    //messageServiceFromURI : uriからnsIMsgMessageServiceを取得
	    //SaveMessageToDisk : メッセージをディスクへ保存
	    var aMsgSvc = messenger.messageServiceFromURI(uri)
	    
	    var saveUri = aMsgSvc.SaveMessageToDisk(uri,   //保存するメッセージのuri
						    path,  //保存先ファイル情報
						    false, //特別な事情がない限りfalseでOK
						    mailSaveListener,//copy完了時に動くcallback
						    outuri,  //謎
						    false, //謎
						    null);   //progress and status feedback
}

//Mail受信時の動作を追加
var atMailReceived = {
    msgAdded: function(aMsgHdr) {
        if( !aMsgHdr.isRead ){
	    ///右下ステータスバーの自己定義要素取得
	    myPanel = document.getElementById("my-panel");
	    myPanel.label = "Start save";

	    Components.utils.import("resource://gre/modules/FileUtils.jsm");
	    Components.utils.import("resource://gre/modules/NetUtil.jsm");

	    //check backup dir
	    path = checkAndgetDir();

	    if( path == "" ){
		return;	    //backup dir check error
	    }

	    //日付ディレクトリ準備OKなので、データ書き込み
	    //configがあればメールからヘッダー情報抜き取り
	    if( (configFlagAcc||configFlagAddr) ){
		getMsgHdr( aMsgHdr, function(aMimeMsg) {
		    var to, from;
		    if( configFlagAcc && aMimeMsg.has("to") ){
			to = chompUrl(aMimeMsg.get("to"));
		    }
		    if( configFlagAddr && aMimeMsg.has("from") ){
			from = chompUrl(aMimeMsg.get("from"));
		    }
		    // アカウントとtoヘッダ     宛先が自アカウントを想定
		    // 指定アドレスとfromヘッダ 送信元アドレスの絞り込み
		    // 指定アドレスとtoヘッダ   メーリス対策でアドレス絞り込み
		    // を比較する
		    if( hashAccount[to] || hashAddress[from] || hashAddress[to] ){
			myPanel.label = "match";
			saveMail(aMsgHdr);
		    }else{
			myPanel.label = "not match";
		    }

		} );
	    }else{ //config無いときはそのまま保存
		saveMail(aMsgHdr)
	    }
	}
    }
}
 
function startup() {
    //setup Config
    getConfigFile();

    //initialize notification panel
    var myPanel = document.getElementById("my-panel");
    myPanel.label = "Mail backup tool is loaded";

    //initialize callback funtion at mail received.
    var notificationService =
	Components.classes["@mozilla.org/messenger/msgnotificationservice;1"]
	.getService(Components.interfaces.nsIMsgFolderNotificationService);
    notificationService.addListener(atMailReceived, notificationService.msgAdded); 
}

window.addEventListener("load", function(e) { 
    startup(); 
}, false);
