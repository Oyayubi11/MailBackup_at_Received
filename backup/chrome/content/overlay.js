
//保存先ディレクトリのチェック、作成、パス名リターン
function checkAndgetDir(myPanel){
    Components.utils.import("resource://gre/modules/FileUtils.jsm");
    Components.utils.import("resource://gre/modules/NetUtil.jsm");

    //Preferencesから保存先ディレクトリ読み出し
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefService).getBranch("extensions.backup.");
    var value = prefs.getCharPref("stringpref");
    
    Application.console.log(value);
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

//Mail受信時の動作を追加
var atMailReceived = {
    msgAdded: function(aMsgHdr) {
        if( !aMsgHdr.isRead ){
	    ///右下ステータスバーの自己定義要素取得
	    var myPanel = document.getElementById("my-panel");
	    myPanel.label = "Start save";

	    Components.utils.import("resource://gre/modules/FileUtils.jsm");
	    Components.utils.import("resource://gre/modules/NetUtil.jsm");

	    var path = checkAndgetDir(myPanel);

	    if( path == "" ){
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
