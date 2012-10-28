//メール内容出力。デバッグ甩
function dispMessage( aMsgHdr ){
    //件名取得
    Application.console.log("subject:" + aMsgHdr.mime2DecodedSubject);
    
    //本文取得
    let messenger = Components.classes["@mozilla.org/messenger;1"]
	.createInstance(Components.interfaces.nsIMessenger);
    let listener = Components.classes["@mozilla.org/network/sync-stream-listener;1"]
        .createInstance(Components.interfaces.nsISyncStreamListener);
    let uri = aMsgHdr.folder.getUriForMsg(aMsgHdr);
    Application.console.log("url:" + uri);

    //messageServiceFromURI : uriからnsIMsgMessageServiceを取得
    //streamMessage : 
    messenger.messageServiceFromURI(uri).streamMessage(uri, listener, null, null, false, "");
    let folder = aMsgHdr.folder;
    var msg = folder.getMsgTextFromStream(listener.inputStream,
					  aMsgHdr.Charset,
					  65536,
					  32768,
					  false,
					  true,
					  { });
    Application.console.log("msg:"+msg);
}

//保存先ディレクトリのチェック、作成、パス名リターン
function checkAndgetDir(myPanel){
    Components.utils.import("resource://gre/modules/FileUtils.jsm");
    Components.utils.import("resource://gre/modules/NetUtil.jsm");

    //Preferencesから保存先ディレクトリ読み出し
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefService).getBranch("extensions.backup.");
    var value = prefs.getCharPref("stringpref");
    
    Application.console.log(value);
    var basedirstr = value;
    var basedir    = new FileUtils.File(basedirstr);
    
    //basedir存在チェック
    if( !basedir.exists() ){
	myPanel.label = "Create basedir";
	basedir.create(1,0777);
    }
    if( !basedir.isDirectory() ){
	myPanel.label = "basedir is file";		
	return "";
    }
	    
    //basedirがあれば日付ディレクトリチェック＋作成
    dd = new Date();
    yy = dd.getYear();
    mm = dd.getMonth() + 1;
    dd = dd.getDate();
    if (yy < 2000) { yy += 1900; }
    if (mm < 10) { mm = "0" + mm; }
    if (dd < 10) { dd = "0" + dd; }
    var datestr = yy+""+mm+""+dd;
    var dirstr = basedirstr + datestr + '/';
    
    var dir    = new FileUtils.File(dirstr);
    
    if( !dir.exists() ){
	myPanel.label = "Create dir";
	dir.create(1,0777);
    }

    if( !dir.isDirectory() ){
	myPanel.label = "dir is file";		
	return "";
    }

    return dirstr;    
}

//保存する際のファイル名指定。現状messageidを利用している。
//なので、ファイル名からは内容が推測しにくい
//件名をファイル名にすると重複が予想されるため、messageidを利用
function getFileName( aMsgHdr ){
    return aMsgHdr.messageId + ".eml";
}

//Mail受信時の動作を追加
var atMailReceived = {
    msgAdded: function(aMsgHdr) {
        if( !aMsgHdr.isRead ){
	    ///右下ステータスバーの自己定義要素取得
	    var myPanel = document.getElementById("my-panel");
	    myPanel.label = "Start save";

	    Components.utils.import("resource://gre/modules/FileUtils.jsm");
	    Components.utils.import("resource://gre/modules/NetUtil.jsm");

	    var dirstr = checkAndgetDir(myPanel);

	    if( dirstr == "" ){
		return;
	    }

	    //日付ディレクトリ準備OKなので、データ書き込み
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
	    var file = new FileUtils.File(dirstr + filestr);
            var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
            var outuri = ioService.newFileURI(file);

	    //messageServiceFromURI : uriからnsIMsgMessageServiceを取得
	    //SaveMessageToDisk : メッセージをディスクへ保存
	    var aMsgSvc = messenger.messageServiceFromURI(uri)
	    var saveUri = aMsgSvc.SaveMessageToDisk(uri,   //保存するメッセージのuri
						    file,  //保存先ファイル情報
						    false, //特別な事情がない限りfalseでOK
						    mailSaveListener,//copy完了時に動くcallback
						    outuri,  //謎
						    false, //謎
						    null);   //progress and status feedback
	}
    }
}
 
function startup() {
    var myPanel = document.getElementById("my-panel");
    myPanel.label = "Mail backup tool is loaded";

    var notificationService =
	Components.classes["@mozilla.org/messenger/msgnotificationservice;1"]
	.getService(Components.interfaces.nsIMsgFolderNotificationService);
    notificationService.addListener(atMailReceived, notificationService.msgAdded); 
}

window.addEventListener("load", function(e) { 
    startup(); 
}, false);
