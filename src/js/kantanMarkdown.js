	// FirefoxでinnerTextが使えない対策
    (function(){
        var temp = document.createElement("div");
        if (temp.innerText == undefined) {
            Object.defineProperty(HTMLElement.prototype, "innerText", {
                get: function()  { return this.textContent },
                set: function(v) { this.textContent = v; }
            });
        }
    })();
  
    
	/* 編集不可ブラウザ判定 */

	// Blobが使用できないブラウザは保存不可(IE9等)
	try {
		new Blob(["temp"]);
	} catch(e) {
		setViewOnly(); 
	}

	// Safariはdownload属性に対応していないので閲覧のみ
	var ua = window.navigator.userAgent.toLowerCase();
	if ((ua.indexOf("chrome") == -1) && (ua.indexOf('safari') != -1)) {
		setViewOnly();
	}

	function setViewOnly() {
		document.getElementById("messageArea").innerText
				 = "このブラウザでは編集できません。";
		var navElems = document.querySelectorAll("nav > *");
		for (var i = 0; i < navElems.length; i++) {
			navElems[i].setAttribute("disabled", "disabled");
		}
	}

	/* アップデート */
    updateKantanVersion(document.getElementById("kantanVersion").value);
	
	var eventListeners = [];
	function on(elementOrQuery, eventName, callback) {
		var element;
		if (typeof elementOrQuery === "string") {
			element = document.querySelectorAll(elementOrQuery);
		} else {
			element = [elementOrQuery];
		}
		
		for (var i = 0; i < element.length; i++) {
			element[i].addEventListener(eventName, callback);
			
			eventListeners.push({
				element: element[i],
				eventName: eventName,
				callback: callback,
			});	
		}
	}

	function removeAllEvents() {
		for (var i = 0; i < eventListeners.length; i++) {
			var element = eventListeners[i].element;
			var eventName = eventListeners[i].eventName;
			var callback = eventListeners[i].callback;
			element.removeEventListener(eventName, callback);
		}
		eventListeners = [];
	}

	function updateKantanVersion (version) {
		document.getElementById("kantanVersion").value = version;
		var edition = document.getElementById("kantanEdition").value;
		var versionElements = document.getElementsByClassName("version");
		for (var i = 0 ; i < versionElements.length; i++) {
			versionElements[i].innerText = version + "_" + edition;
		}
	}
	
	function updateKantanEdition (edition) {
		document.getElementById("kantanEdition").value = edition;
	}
	
	function kantanUpdate(json) {
		json.doUpdate();
	}
	
	on("#updateButton", "click", function(event) {
		event.preventDefault();
		
		if(!window.confirm(
				"最新版にアップデートします。\n" +
				"不測の事態に備えて、現在編集中のドキュメントは保存しておくことをお勧めします。\n" + 
				"\n" + 
				"【OK】：アップデート実行(あと何回かダイアログが表示されます)\n" + 
				"【キャンセル】：キャンセル")){
			return false;
		}
		
		var script = document.createElement("script");
		script.src = "http://tatesuke.github.io/KanTanMarkdown/kantanUpdate.js";
		//script.src = "http://localhost:3000/kantanUpdate.js";
		script.class = "kantanUpdateScript";
		script.onerror = function () {
			alert("アップデートに失敗しました。\n" + 
			"アップデート用のファイルにアクセスできませんでした。\n" + 
			"インターネットに接続されていないか、サーバーダウンです");
		};
		document.querySelector("#updateScriptArea").appendChild(script);
		
		return false;
	})
	
	/* 端末固有設定 */
	// 現在のところチェックボックスのみなので
	// チェックボックスに特化して実装している
	var saveValueElements = document.querySelectorAll(
			"#settingMenu input[type=checkbox]");
	for (var i = 0; i < saveValueElements.length; i++) {
		var element = saveValueElements[i];

		if (element.id === 'settingWide') {
			// 縦横比はローカルストレージには保存せず、直接ファイルに書き出す
			on (element, "change", function() {
				if (this.checked) {
					this.setAttribute('checked', 'checked');
				} else {
					this.removeAttribute('checked');
				}
			});
		} else {
			// それ以外はローカルストレージに保存
			var savedValue = getItem(element.id, null);
			if (savedValue != null) {
				element.checked = (savedValue == "true");
			}
			on (element, "change", function() {
				setItem(this.id, this.checked);
			});
		}
	}
	
	function getItem(name, defaultValue) {
		try {
			var value = localStorage.getItem("com.tatesuke.ktm." + name);
			return (value != null) ? value : defaultValue;
		} catch(e) {
			return defaultValue;
		}
	}

	function setItem(name, value) {
		try {
			localStorage.setItem("com.tatesuke.ktm." + name, value);
		} catch(e) {
			// 握りつぶし
		}
	}
	
	/* エディタに機能追加 */
	toKantanEditor(document.getElementById("editor"));
	toKantanEditor(document.getElementById("cssEditor"));
	
	/* 画像キャッシュ */
	var imageUrlMap = {};
	function getCachedImageUrl(name, createOnNoCached) {
		var imageUrl = imageUrlMap[name];
		if ((imageUrl == null) && createOnNoCached) {
			var element = document.getElementById("attach-" + name);
			if (element != null) {
				return cacheImageUrl(name, element.innerHTML);
			} else {
				return null;
			}
		} else {
			return imageUrl;
		}	
	}
	
	function cacheImageUrl(name, base64) {
		var imageUrl;
		if (window.URL) {
			var blob = base64ToBlob(base64);
			imageUrl = {
					blobOrBase64:window.URL.createObjectURL(blob),
					base64:base64}
		} else {
			imageUrl = {
					blobOrBase64:base64,
					base64:base64}
		}
		
		imageUrlMap[name] = imageUrl;
		return imageUrl;
	}
	
	function uncacheImageUrl(name) {
		var imageUrl = imageUrlMap[name];
		if (window.URL && imageUrl) {
			window.URL.revokeObjectURL(imageUrl);
		} 
		delete imageUrlMap[name];
	}
	
	/* 起動時にコンテンツ読み込み */
	addClass(document.querySelector("body"), "previewMode");
	removeClass(document.querySelector("body"), "editMode");
	removeClass(document.querySelector("body"), "initialState");
	if (isEnable(document.getElementById("toggleButton")) 
			&& (document.getElementById("editor").innerHTML == "")) {
		// 編集モードでなく、内容が空であれば初期状態を編集モードにする
		toggleMode();
	} else {
		doPreview();
	}

	/* レイアウト調整 */
	doLayout();
	on(window, "resize", doLayout);
	function doLayout() {
		var wrapper = document.getElementById("wrapper");
		
		var wrapperHeight = window.innerHeight - wrapper.offsetTop;
		wrapper.style.height = wrapperHeight + "px";
	}

	/* 編集・閲覧切り替え */
	var editorScrollBarPos = 0;
	var caretStartPos = 0;
	var caretEndPos = 0;
	var isPreviewerOpened = true;
	on("#toggleButton", "click", toggleMode);

	function toggleMode() {
		var attach = document.getElementById("attach");
		var editorTabWrapper = document.getElementById("editorTabWrapper");
		var editor = document.getElementById("editor");
		var previewer = document.getElementById("previewer");
		if (isEditMode()) {
			editorScrollBarPos = editor.scrollTop;
			caretStartPos = editor.selectionStart;
			caretEndPos = editor.selectionEnd;
		}

		if (isEditMode()) {
			// プレビューモードへ
			isPreviewerOpened = isVisible(previewer);
			if (isPreviewerOpened == false) {
				openPreview();
			}
			
			hide(attach);
			hide(editorTabWrapper);
			doPreview();
			
			// レイアウト修正
			addClass(document.querySelector("body"), "previewMode");
			removeClass(document.querySelector("body"), "editMode");
			doLayout();

			previewer.focus();
		} else {
			// 編集モードへ
			showBlock(attach);
			showBlock(editorTabWrapper);
			doPreview();
			
			if (isPreviewerOpened == false) {
				closePreview();
			}
			
			// レイアウト修正
			removeClass(document.querySelector("body"), "previewMode");
			addClass(document.querySelector("body"), "editMode");
			doLayout();
		}
		
		if (isEditMode()) {
			editor.scrollTop    = editorScrollBarPos;
			editor.selectionStart = caretStartPos;
			editor.selectionEnd = caretEndPos;
			editor.focus();
		}
	}

	/* Markdownエディタとプレビューの同期 */

	// 自動同期チェックボックスをクリックしたらchecked属性を更新する
	// これを行わないと自動同期チェックボックスの状態が保存されない
	on("#settingAutoSync", "change", function() {
		if (this.checked == true) {
			this.setAttribute("checked", "checked");
		} else {
			this.removeAttribute("checked");
		}
	});

	//更新ボタンを押したら更新する 
	on("#syncButton", "click", doPreview);

	// エディタに変化があったらプレビュー予約
	on("#editor", "change", queuePreview);
	on("#editor", "keyup", queuePreview);
	
	// 自動更新がONならプレビューする
	// ただし、onkeyupなど呼ばれる頻度が高いので一定時間待って最後の呼び出しのみ実行する
	var previewQueue = null; // キューをストック 
	var queuePreviewWait = 300; // 0.3秒後に実行の場合 
	function queuePreview() {
		var settingAutoSync = document.getElementById("settingAutoSync");
		if (!settingAutoSync.checked) {
			return;
		}

		// イベント発生の都度、キューをキャンセル 
		clearTimeout( previewQueue );
		 
		// waitで指定したミリ秒後に所定の処理を実行 
		// 経過前に再度イベントが発生した場合
		// キューをキャンセルして再カウント 
		previewQueue = setTimeout(doPreview, queuePreviewWait);
	}
  
	// 同期実行
	function doPreview() {
    // 現在の表示ページを保存
    if (window.slideshow) {
      var pageNumber = slideshow.getCurrentSlideIndex() + 1;
    }
    
    // プレビュー用の iframe を再作成（イベントリスナーの登録しすぎでメモリリークの警告が出るため）
    var wrapper = document.getElementById('wrapper');
		var oldPreviewer = document.getElementById("previewer");
    wrapper.removeChild(oldPreviewer);
    
    var newPreviewer = document.createElement('iframe');
    newPreviewer.id = 'previewer';
    wrapper.appendChild(newPreviewer);
    
		setupHeadingSyncEventHandling();

    var previewerDocument = newPreviewer.contentDocument;
    previewerDocument.open();
    previewerDocument.write('<head></head><body></body>'); // firefox ではこうしないと body を書き出せない
    previewerDocument.close(); // firefox では close しないと動かない
    
    // <head> の初期化
    var previewerHead = previewerDocument.head;
    
    // style タグ追加
    var remarkStyle = previewerDocument.createElement('style');
    remarkStyle.id = 'remarkStyle';
    remarkStyle.type = 'text/css';
    previewerHead.appendChild(remarkStyle);
    
    // Remark のソースをプレビュー領域にコピー
    var remarkScript = previewerDocument.createElement('script');
    remarkScript.type = 'text/javascript';
    remarkScript.innerHTML = document.getElementById('remarkJs').innerHTML;
    previewerHead.appendChild(remarkScript);
		
		// <body> の初期化
    var previewerBody = previewerDocument.body;
    // ショートカットキー設定
    on(previewerBody, 'keydown', shortcutKey);
    
    // textarea 追加
    var textArea = previewerDocument.createElement('textarea');
    textArea.innerHTML = editor.value;
    textArea.id = 'source';
    previewerBody.appendChild(textArea);
    
    // script 追加
    var isWide = document.getElementById('settingWide').checked;
    var buildRemarkScript = previewerDocument.createElement('script');
    buildRemarkScript.type = 'text/javascript';
    buildRemarkScript.innerHTML = 'window.parent.slideshow = remark.create({'
                                + '  ratio: "' + (isWide ? '16:9' : '4:3') + '",'
                                + '  highlightLines: true'
                                + '});';
    previewerBody.appendChild(buildRemarkScript);
  
		// prepreviewedイベントをディスパッチ
    var event = document.createEvent("Event");
    event.initEvent("prepreview", true, true);
    newPreviewer.dispatchEvent(event);
    
    // CSS修正
    var cssEditor = document.querySelector("#cssEditor");
    var replacedCss = replaceAttachURL(cssEditor.value);
    previewerDocument.querySelector('#remarkStyle').innerHTML = replacedCss;
    
		// タイトル変更
		var h1 = previewerBody.querySelector("h1");
		if(h1 && h1.textContent !== 'Help') { // remark が Help というタイトルを作ってしまうので、それを回避
			document.title = h1.textContent;
		} else {
			document.title = "無題";
		}
		if (saved == false) {
			document.title = "* " + document.title;
		}
		
		// 画像埋め込み
		var images = previewerBody.querySelectorAll("img");
		for (var i = 0; i < images.length; i++) {
			var elem = images[i];
			loadImage(elem);
		}
		
		// リンク
		var anchors = previewerBody.querySelectorAll("a");
		for(i in anchors) {
			var anchor = anchors[i];
			var href = anchor.href;
			if (href) {
				var matchs = href.trim().match(/^attach:(.+)/);
				if (matchs) {
					var name = decodeURIComponent(matchs[1]);
					getFileBlog(name, function(blob){
						var url = window.URL || window.webkitURL;
						var blobUrl = url.createObjectURL(blob);
						anchor.href = blobUrl;
						anchor.download = name;
					});
				}
			}
		}
		
		
		// シーケンス図
		if (typeof Diagram !== "undefined") {
			var sequences = previewerBody.getElementsByClassName("sequence");
			for (var i = 0; i < sequences.length; i++) {
				var sequence = sequences[i];
				var diagram = Diagram.parse(sequence.textContent);
				sequence.innerHTML = "";
				diagram.drawSVG(sequence, {theme: 'simple'});
			}
		}
		
		// フローチャート
		if (typeof flowchart !== "undefined") {
			var flows = previewerBody.getElementsByClassName("flow");
			for (var i = 0; i < flows.length; i++) {
				var flow = flows[i];
				var diagram = flowchart.parse(flow.textContent);
				flow.innerHTML = "";
				diagram.drawSVG(flow);
			}
		}
		
		// previewedイベントをディスパッチ
		var event = document.createEvent("Event");
		event.initEvent("previewed", true, true);
		newPreviewer.dispatchEvent(event);
    
    // 再作成すると先頭ページに戻されるので、再作成前のページを表示させる
    if (typeof pageNumber !== 'undefined' && window.slideshow) {
      slideshow.gotoSlide(pageNumber);
    }

		// メニューバーの表示切り替え
		var hideMenuBar = document.getElementById('settingHideMenuBarAtPreview').checked;
		var menuBarStyle = (!isEditMode() && hideMenuBar) ? 'none' : 'block';

		document.getElementById('menuBar').style.display = menuBarStyle;
	}
	
	function replaceAttachURL(str) {
		var replaced = "";
		var i = 0;
		var prefix = 'url("attach:';
		var surfix = '"';
		var n = prefix.length;
		while (i < str.length) {
			// prefixから始まるなら置き換える
			if ((i + prefix.length) < str.length) {
				var temp = str.substr(i, prefix.length);
				if (temp == prefix) {
					i += prefix.length;
					
					// 名前取得
					var name = "";
					var c = str.charAt(i++);
					while (c != surfix) {
						name += c;
						c = str.charAt(i++);
					}
					
					// 画像があればURLに置き換えて出力
					var url = getCachedImageUrl(name, true);
					if (url == null) {
						replaced += prefix + name + surfix;
					} else {
						replaced += 'url("' + url.blobOrBase64 + surfix;
					}
					continue;
				}
			}
			
			var c = str.charAt(i++);
			replaced += c;
			
			/* ""で囲まれた文字列ならスキップ */
			if (c == '"') {
				c = str.charAt(i++);
				while (c != '"') {
					replaced += c;
					c = str.charAt(i++);
				};
				replaced += c;
				continue;
			}
		}
		return replaced;
	}
	
	function loadImage(elem) {
		var name = null;
		if (elem.name) {
			name = elem.name;
		} else if (elem.src) {
			var matchs = elem.src.trim().match(/^attach:(.+)/);
			if (matchs) {
				name = decodeURIComponent(matchs[1]);
			}
		}
		
		if (name == null) {
			return;
		}
		
		loadImageByName(
				name,
				function(width, height) {
				 	// 大きさが決まったら仮のイメージで領域だけ確保しておく
					var canvas = document.createElement("canvas");
					canvas.width = width;
					canvas.height = height;
					elem.src = canvas.toDataURL();
				},
				function(imageUrl) {
					elem.src = imageUrl.blobOrBase64;
				});
	}
	
	function loadImageByName(name, onLoadSize, onLoadImage) {
		var base64Script = document.getElementById("attach-" + name);
		if (base64Script != null) {
			var rootElem = base64Script.parentNode;
			var base64 = base64Script.innerHTML;
			var layer64 = rootElem.querySelector("script.layerContent").innerHTML;
			var trimInfo = rootElem.querySelector("script.trimInfo").innerHTML;
			trimInfo = (trimInfo != "") ? JSON.parse(trimInfo) : null;
			
			var cached = getCachedImageUrl(name, false);
			if (cached) {
				onLoadImage(cached);
				return;
			}
			
			if (trimInfo == null) {
				var url = cacheImageUrl(name, base64);
				onLoadImage(url);
				return;
			}
			
			onLoadSize(trimInfo.w, trimInfo.h);
			
			var baseImage = new Image();
			baseImage.onload = function() {
				var canvas = document.createElement("canvas");
				canvas.width = trimInfo.w;
				canvas.height = trimInfo.h;
				var ctx = canvas.getContext('2d');
				ctx.translate(-trimInfo.x, -trimInfo.y);
				ctx.drawImage(baseImage,0, 0);
				if (layer64 != "") {
					var layerImage = new Image();
					layerImage.onload = function() {
						ctx.drawImage(layerImage,0, 0);
						
						var content = canvas.toDataURL();
						var url = cacheImageUrl(name, content);
						onLoadImage(url);
					};
					layerImage.src = layer64;
				} else {
					var content = canvas.toDataURL();
					var url = cacheImageUrl(name, content);
					onLoadImage(url);
				}
			};
			baseImage.src= base64;
		}
	}
  
  /* 縦横比の変更イベントを監視 */
  on('#settingWide', 'change', function() {
    doPreview();
  });
	
	/* CSSエディタ変更周り */
	// エディタに変化があったらプレビュー予約
	on("#cssEditor", "change", cssChanged);
	on("#cssEditor", "keyup", cssChanged);

	function cssChanged() {
		saved = false;
		var title = document.title;
		if (!title.match(/^\*/)) {
			document.title = "* " + title;
		}
	}

	/* ファイル添付 */
	on("#attachButton", "change", function(e) {
		var elem = e.target;
	    var files = elem.files;
	    attachFiles(files);
	});
	on("body", "dragover", function(e) {
		e.stopPropagation();
		e.preventDefault();
		e.dataTransfer.dropEffect = 'copy';
		addClass(this, 'onDragover');
	});
	on("body", "drop", function(e) {
		e.stopPropagation();
		e.preventDefault();
		attachFiles(e.dataTransfer.files);
		removeClass(this, "onDragover");
	});
	on("body", "dragleave", function(e){
		removeClass(this, "onDragover");
	});

	function attachFiles(files){
		for (var i = 0; i < files.length; i++) {
			var file = files[i];
			var type = files[i].type;
			if (type == "text/html") {
				attachHtmlFile(file)
			} else {
				attachFile(file);
			}
		}
	}
	
	function attachFile(file, fileName) {
		var fr = new FileReader();
		if (fileName) {
			fr.fileName = fileName;
		} else {
			fr.fileName = file.name;
		}
	    fr.onload = function(e) {
			var target = e.target;
			addAttachFileElement(target.fileName, target.result, "", "", true);
		};
		fr.readAsDataURL(file);
	}
	
	function attachHtmlFile(file) {
		var fr = new FileReader();
		fr.fileName = file.name;
		fr.onload = (function (file) {
			return function(e) {
				// <html></html>の中身だけ取り出し疑似的にdomを作る
				var result = e.target.result;
				var innerHtml = result.substring(23, result.length - 8);
				var dummyHtml = document.createElement("html");
				dummyHtml.innerHTML = innerHtml;
				
				// 簡単HTMLの構造か調べる
				var importFlag = false;
				var fileListElement = dummyHtml.querySelector("ul#fileList");
				var editorElement = dummyHtml.querySelector("textarea#editor");
				if (fileListElement && editorElement) {
					showImportDialog(
							"かんたんMarkdownのファイルを検出しました。どの項目をインポートしますか？"
							, function(result){
						if (result.result == true) {
							importKantanMarkdown(result, dummyHtml, file);
						} else {
							attachFile(file);
						}
					});
					
				} else {
					attachFile(file);
				}
			}
		})(file);
		fr.readAsText(file)
	}
	
	function importKantanMarkdown(result, dummyHtml, file) {
		if (result.attach == true) {
			var fileListElement = dummyHtml.querySelectorAll("ul#fileList li");
			for (var i = 0; i < fileListElement.length; i++) {
				var scriptElement = fileListElement[i].querySelector("script");
				var fileName = scriptElement.title;
				var content = scriptElement.innerHTML;
				
				var layerElement = fileListElement[i].querySelector("script.layerContent");
				var layerContent = (layerElement) ? layerElement.innerHTML : "";
				
				var trimInfoElement = fileListElement[i].querySelector("script.trimInfo");
				var trimInfo = (trimInfoElement) ? trimInfoElement.innerHTML : "";
				
				addAttachFileElement(fileName, content, layerContent, trimInfo, false);
			}
			saved = false;
		}
		
		if (result.markdown == true) {
			var editorElement = dummyHtml.querySelector("textarea#editor")
			var editor = document.getElementById("editor");
			editor.value = editor.value + editorElement.value;
			saved = false;
		}
		
		if (result.css == true) {
			var styleElement = dummyHtml.querySelector("#previewerStyle");
			if (styleElement) {
				var cssEditor = document.getElementById("cssEditor");
				var dummyCssEditor = dummyHtml.querySelector("#cssEditor");
				if (styleElement.innerHTML.trim() != "") {
					cssEditor.value = styleElement.innerHTML;
					saved = false;
				} else if (dummyCssEditor) {
					cssEditor.value = dummyCssEditor.value;
					saved = false;
				}
			}
		}
		
		doPreview();
	} 
	
	function showImportDialog(msg, callback) {
		document.getElementById("saveButton").disabled =  true;
		document.getElementById("importDialogMessage").innerText = msg;
		var dialogElement = document.getElementById("importDialog");
		dialogElement.querySelector("form").reset();
		
		document.getElementById("importDialogOkButton").onclick = function(e){
			e.preventDefault();
			hide(dialogElement);
			document.getElementById("importDialogMessage").innerText = "";
			
			var result = {
				result: true,
				attach: document.getElementById("importDialogAttach").checked,
				markdown:document.getElementById("importDialogMarkdown").checked,
				css:document.getElementById("importDialogCss").checked,
			}
			callback(result);
			
			if (document.getElementById("importDialogOkButton")) {
				document.getElementById("importDialogOkButton").onclick = null;
			}
			if (document.getElementById("importDialogCancelButton")) {
				document.getElementById("importDialogCancelButton").onclick;
			}
			if (document.getElementById("saveButton")) {
				document.getElementById("saveButton").disabled =  false;
			}
			
			return false;
		};
		
		
		document.getElementById("importDialogCancelButton").onclick = function(e) {
			e.preventDefault();
			hide(dialogElement);
			document.getElementById("importDialogMessage").innerText = "";
			
			callback({result:false});
			
			delete document.getElementById("importDialogOkButton").onclick;
			delete document.getElementById("importDialogCancelButton").onclick;
			document.getElementById("saveButton").disabled =  false;
			
			return false;
		}
		
		showBlock(dialogElement);
		
		var body = document.querySelector("body");
		dialogElement.style.top = "10px";
		dialogElement.style.left = ((body.offsetWidth / 2.0) - (dialogElement.offsetWidth / 2.0)) + "px";
	}
	
	function addAttachFileElement(fileName, content, layerContent, trimInfo, insertImgTag) {
		var name = fileName;
		var script = document.querySelector("#fileList script[title='" + name + "']");
		var i = 2;
		while (script) {
			var pos = fileName.lastIndexOf(".");
			pos = (pos != -1) ? pos : fileName.length;
			var name = fileName.substring(0, pos);
			var ext = fileName.substr(pos);
			name = name + "_" + i + ext;
			script = document.querySelector("#fileList script[title='" + name + "']");
			i++;
		}
		
		var li = document.createElement("li");
		
		var script = document.createElement("script");
		script.type  = "text/template";
		script.id    = "attach-" + name;
		script.title = name;
		script.innerHTML = content;
		li.appendChild(script);
		
		var layerScript = document.createElement("script");
		layerScript.type  = "text/template";
		addClass(layerScript, "layerContent");
		layerScript.innerHTML = layerContent;
		li.appendChild(layerScript);
		
		var trimScript = document.createElement("script");
		trimScript.type  = "text/template";
		addClass(trimScript, "trimInfo");
		trimScript.innerHTML = trimInfo;
		li.appendChild(trimScript);
		
		var upButton = document.createElement("button");
		addClass(upButton, 'upButton');
		upButton.innerHTML = "↑";
		on(upButton, "click", onUpButtonClicked);
		li.appendChild(upButton);
		
		var downButton = document.createElement("button");
		addClass(downButton, 'downButton');
		downButton.innerHTML = "↓";
		on(downButton, "click", onDownButtonClicked);
		li.appendChild(downButton);
		
		var input  = document.createElement("input");
		input.type = "text";
		addClass(input, 'fileName');
		input.value = name;
		on(input, "blur", onFileNameChanged);
		li.appendChild(input);
		
		var insertButton = document.createElement("button");
		addClass(insertButton, 'insertButton');
		insertButton.innerHTML = "Insert Tag";
		on(insertButton, "click", onInsertButtonClicked);
		li.appendChild(insertButton);
		
		var isImage = content.match("data:image/.+?;base64,");
		var editoButton = document.createElement("button");
		addClass(editoButton, 'editButton');
		editoButton.innerHTML = "Edit";
		editoButton.disabled = !isImage;
		on(editoButton, "click", onEditButtonClicked);
		li.appendChild(editoButton);
		
		var downloadButton = document.createElement("button");
		addClass(downloadButton, 'downloadButton');
		downloadButton.innerHTML = "Download";
		on(downloadButton, "click", onDownloadButtonClicked);
		li.appendChild(downloadButton);
		
		var detachButton = document.createElement("button");
		addClass(detachButton, 'detachButton');
		detachButton.innerHTML = "×";
		on(detachButton, "click", onDetachButtonClicked);
		li.appendChild(detachButton);
		
		document.getElementById("fileList").appendChild(li);
		
		// ファイル添付領域を開く
		var editor = document.getElementById("editor");
		var toggleButton = document.getElementById("toggleButton");
		var filer = document.getElementById("filer");
		if (!isEditMode()) {
			toggleButton.click();
		}
		if (!isVisible(filer)) {
			openFiler();
		}
		
		// イメージタグを挿入
		var setting = document.querySelector("#settingInsertImgTagAfterAttach");
		if (isImage && insertImgTag && setting.checked) {
			var tag = '<img src="attach:' + name  + '">';
			insertToEditor(document.getElementById("editor"), tag);
		}
		
		saved = false;
		queuePreview();
	}

	function getFileBlog(name, onLoaded) {
		var script = document.getElementById("attach-" + name);
		if (!script) {
			onLoaded(null);
		}
		
		var callBack = function(imageUrl) {
			
		}
		
		var base64 = script.innerHTML;
		var mimeType = base64.match(/^\s*data:(.*);base64/)[1];
		if (mimeType.match("^image")) {
			loadImageByName(name, function(){}, function(imageUrl) {
				onLoaded(base64ToBlob(imageUrl.base64));
			});
		} else {
			onLoaded(base64ToBlob(base64));
		}
	}

	function base64ToBlob(base64) {
		var mimeType = base64.match(/^\s*data:(.*);base64/)[1];
		var bin = atob(base64.replace(/^.*,/, ''));
		var buffer = new Uint8Array(bin.length);
		for (var i = 0; i < bin.length; i++) {
			buffer[i] = bin.charCodeAt(i);
		}
		var blob = new Blob([buffer.buffer], {
			type: mimeType
		});
		return blob;
	}

	/* 添付ファイル並び替え */
	on(".upButton", "click", onUpButtonClicked);
	function onUpButtonClicked(e) {
		var currentLi = e.target.parentNode;
		var previousLi = currentLi.previousElementSibling;
		if (previousLi) {
			var ul = currentLi.parentNode;
			ul.insertBefore(currentLi, previousLi);
		}
	}
	
	on(".downButton", "click", onDownButtonClicked);
	function onDownButtonClicked(e) {
		var currentLi = e.target.parentNode;
		var nextLi = currentLi.nextElementSibling;
		if (nextLi) {
			var ul = currentLi.parentNode;
			ul.insertBefore(nextLi, currentLi);
		}
	}
	
	/* ファイル削除 */
	on(".detachButton", "click", onDetachButtonClicked);
	function onDetachButtonClicked(e) {
		// 削除ボタンが押されたら親要素(li)ごと削除
		if(window.confirm('削除していいですか?')){
			var parent = e.target.parentNode;
			var name = parent.querySelector("script").name;
			uncacheImageUrl(name);
			parent.parentNode.removeChild(parent);
			saved = false;
		}
	}

	/* ファイル名変更 */
	var fileNameElems = document.getElementsByClassName("fileName");
	for (var i = 0; i < fileNameElems.length; i++) {
		// なぜかvale属性の変更が保存されないので起動時に引っ張ってきてやる
		var fileNameElem = fileNameElems[i];
		var script = fileNameElem.parentNode.querySelector("script");
		var fileName = script.title;
		fileNameElem.value = fileName;
	}
	on("#fileList input", "blur", onFileNameChanged);
	function onFileNameChanged (e) {
		var target = e.target;
		var name = target.value.trim();
		var selfName = target.parentNode.querySelector("script").title;
		
		if (name == selfName) {
			return true;
		}
		if (name == "") {
			alert("名前は必ず入力してください。");
			e.target.focus();
			return false;
		}
		var script = document.querySelector("#fileList script[title='" + name + "']");
		if (script) {
			alert("名前が重複しています。");
			target.focus();
			target.selectionStart = 0;
			target.selectionEnd = name.length;
			return false;
		} 
		var scriptTag = target.parentNode.querySelector("script");
		uncacheImageUrl(scriptTag.title);
		scriptTag.id =  "attach-" + name;
		scriptTag.title = name;
		saved = false;
		queuePreview();
		return true;
	}

	/* 添付ファイルをエディタに挿入 */
	on(".insertButton", "click", onInsertButtonClicked);
	function onInsertButtonClicked (e) {
		var target = e.target;
		var script = target.parentNode.querySelector("script");
		var isImage = script.innerHTML.match("data:image/.+?;base64,");
		var fileName = script.title;
		
		var editor = document.getElementById("editor");
		if (isVisible(editor)) {
			var insertText;
			if (isImage) {
				insertText = '<img src="attach:' + fileName  + '">';
			} else {
				insertText= '<a href="attach:' + fileName +'">' + fileName + '</a>';
			}
			insertToEditor(editor, insertText);
		}
		var cssEditor = document.getElementById("cssEditor");
		if (isVisible(cssEditor) && isImage) {
			var insertText = 'url("attach:' + fileName  + '")';
			insertToEditor(cssEditor, insertText);
		}
	}
	
	function insertToEditor(editor, insertText) {
		var text = editor.value;
		var newPos = editor.selectionStart + insertText.length;
		var part1 = text.substring(0, editor.selectionStart);
		var part2 = text.substr(editor.selectionEnd);
		editor.value = part1 + insertText + part2;
		editor.selectionStart = newPos;
		editor.selectionEnd = newPos;
		updateScrollPos(editor);
		var event= document.createEvent("Event");
		event.initEvent("changeByJs",false,false);
		editor.dispatchEvent(event);
	}
	
	/* 添付ファイルをダウンロード */
	on(".downloadButton", "click", onDownloadButtonClicked);
	function onDownloadButtonClicked (e) {
		var target = e.target;
		var script = target.parentNode.querySelector("script");
		var fileName = script.title;
		getFileBlog(fileName, function(blob) {
			if (window.navigator.msSaveBlob) {
				window.navigator.msSaveBlob(blob, fileName);
			} else {
				var url = window.URL || window.webkitURL;
				var blobURL = url.createObjectURL(blob);
				var a = document.createElement('a');
				a.download = fileName;
				a.href = blobURL;
				
				// firefoxでa.click()が効かないため無理やりclickイベントをディスパッチする
				var ev = document.createEvent("MouseEvents");
			    ev.initMouseEvent("click", true, false, self, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
				a.dispatchEvent(ev);
				delete a;
			}
		});
	}
	
	/* お絵かき周り */
	var drawer = new KantanDrawer(document.querySelector("#drawArea"));
	on(".editButton", "click", onEditButtonClicked);
	function onEditButtonClicked(e) {
		var rootElement = e.target.parentNode;
		var contentElement = rootElement.querySelector("script");
		var layerElement = rootElement.querySelector("script.layerContent");
		var trimElement = rootElement.querySelector("script.trimInfo");
		
		addClass(document.querySelector("body"), "drawMode");
		
		var nav = document.querySelector("nav");
		var attach = document.querySelector("#attach");
		var wrapper = document.querySelector("#wrapper");
		
		hide(nav);;
		hide(attach);
		hide(wrapper);
		
		drawer.show(contentElement.innerHTML,
				layerElement.innerHTML,
				trimElement.innerHTML,
				function(layerContent, trimInfo) {
					layerElement.innerHTML = layerContent;
					trimElement.innerHTML = trimInfo;
					
					showBlock(nav);
					showBlock(attach);
					showBlock(wrapper);
					removeClass(document.querySelector("body"), "drawMode");
					
					uncacheImageUrl(contentElement.title);
					doPreview();
				},
				function() {
					showBlock(nav);
					showBlock(attach);
					showBlock(wrapper);
					removeClass(document.querySelector("body"), "drawMode");
				}
		);
	}
	
	/* 添付ファイル領域開け閉め */
	on("#attachToggleButton", "click", function() {
		if (isVisible(document.getElementById("filer"))){
			closeFiler();
		} else {
			openFiler();
		}
	});

	/* プレビュー領域開け閉め */
	on("#previewToggleButton", "click", function() {
		if (isVisible(document.getElementById("previewer"))){
			closePreview();
		} else {
			openPreview();
		}
	});

	function openFiler() {
		document.getElementById("attachToggleButton").innerText = "添付ファイルを隠す(Alt+↑)";
		showBlock(document.getElementById("attachForm"));
		showBlock(document.getElementById("filer"));
		doLayout();
	}

	function closeFiler() {
		document.getElementById("attachToggleButton").innerText = "添付ファイルを表示(Alt+↓)";
		hide(document.getElementById("attachForm"));
		hide(document.getElementById("filer"));
		doLayout();
	}

	function openPreview() {
		// エディタサイズに相対値を利用しているためプレビュー表示されていない場合のみ実行
		// 閲覧モード時は実行しない
		var editorTabWrapper = document.getElementById("editorTabWrapper");
		var previewer = document.getElementById("previewer");
		if (isEditMode() && !isVisible(previewer)) {
			document.getElementById("previewToggleButton").innerText = "プレビューを隠す(Alt+→)";
			removeClass(editorTabWrapper, "fullWidth");
			showBlock(previewer);
			doLayout();
		}
	}

	function closePreview() {
		// エディタサイズに相対値を利用しているためプレビュー表示されている場合のみ実行
		// 閲覧モード時は実行しない
		var editorTabWrapper = document.getElementById("editorTabWrapper");
		var previewer = document.getElementById("previewer");
		if (isEditMode() && isVisible(previewer)) {
			document.getElementById("previewToggleButton").innerText = "プレビューを表示(Alt+←)";
			addClass(editorTabWrapper, "fullWidth");
			hide(previewer);
			doLayout();
		}
	}

	/* 保存 */
	var contentAtSave = editor.value;
	on("#saveButton", "click", save);
	function save() {
		var html = getHTMLForSave();
		
		var blob = new Blob([html]);
		if (window.navigator.msSaveBlob) {
			/* for IE */
			window.navigator.msSaveBlob(blob, document.title + ".html");
		} else {
			var url = window.URL || window.webkitURL;		
			var blobURL = url.createObjectURL(blob);
			var a = document.createElement('a');
			a.download = document.title.replace(/^\* /, "") + ".html";
			a.href = blobURL;
			
			// firefoxでa.click()が効かないため無理やりclickイベントをディスパッチする
			var ev = document.createEvent("MouseEvents");
		    ev.initMouseEvent("click", true, false, self, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
			a.dispatchEvent(ev);
			delete a;
		}
	}

	function getHTMLForSave() {
		// アップデート用のscriptタグを消す
		document.querySelector("#updateScriptArea").innerHTML = "";
		
		// テキストエリアは値を入れなおさないと保存されない。
		var editor = document.getElementById("editor");
		editor.innerHTML = editor.value.replace(/</g, "&lt;");
		
		var cssEditor = document.getElementById("cssEditor");
		cssEditor.innerHTML = cssEditor.value;
		
		var toggleFlag = isEditMode();
		if (toggleFlag == true) {
			toggleMode();
		}
		addClass(document.querySelector("body"), "initialState");
		
		/* ファイルの肥大化を防ぐため中身を消去 */
		document.getElementById("previewer").innerHTML = "";
		document.getElementById("messageArea").innerHTML = "";
		document.getElementById("previewerStyle").innerHTML="";
		
		// 不要なdiffの原因となるスタイルなどを削除
		if (document.title.match(/^\* .*/)) {
			document.title = document.title.substr("\* ".length);
		}
		
		var stylees = document.querySelectorAll("*[style]");
		for (var i = 0; i < stylees.length; i++) {
			var stylee = stylees[i];
			stylee.removeAttribute("style");
		}
		
		document.querySelector("#previewer").removeAttribute("class");
		
		// HTML生成
		var html = "<!doctype html>\n<html>\n";
		html += document.getElementsByTagName("html")[0].innerHTML;
		var i = html.lastIndexOf("/script>"); // bug fix #1 #39
		html = html.substring(0, i);
		html += "/script>\n</body>\n</html>";
		
		contentAtSave = editor.value;
		saved = true;
		doPreview();
		
		removeClass(document.querySelector("body"), "initialState");
		if (toggleFlag == true) {
			toggleMode();
		}
    
    doLayout();
    
		return html;
	}

	/* 更新時、終了時の警告 */
	var saved = true;
	window.onbeforeunload = function() {
		if (!saved) {
			return "ドキュメントが保存されていません。"
		}
	}

	on("#editor", "input", updateSavedFlag);

	function updateSavedFlag() {
		if (contentAtSave == document.getElementById("editor").value) {
			saved = true;
		} else {
			saved = false;
		}
	}

	/* オンラインメニュー */
	on("#onlineMenuButton", "click", function(){
		var button = this;
		var onlineMenu = document.getElementById("onlineMenu");
		onlineMenu.style.top = (this.offsetTop + this.scrollHeight) + "px";
		showBlock(onlineMenu);
	});

	on("body", "click", function(e){
		var onlineMenuButton = document.getElementById("onlineMenuButton");
		if (e.target != onlineMenuButton) {
			hide(document.getElementById("onlineMenu"));
		}
	});
	
	/* 設定メニュー */
	on("#settingMenuButton", "click", function(){
		var button = this;
		var settingMenu = document.getElementById("settingMenu");
		settingMenu.style.top = (this.offsetTop + this.scrollHeight) + "px";
		settingMenu.style.left = this.offsetLeft + "px";
		showBlock(settingMenu);
	});

	on("body", "click", function(e){
		var current = e.target;
		
		var settingMenuButton = document.getElementById("settingMenuButton");
		if (current ==  settingMenuButton) {
			return true;
		}
		
		var settingMenu = document.getElementById("settingMenu");
		while (current != null) {
			if (current == settingMenu) {
				return true;
			}
			current = current.parentNode;
		}
		hide(settingMenu);
	});

	/* 見出し同期 */
	on("#headingSyncButton", "click", headingSyncToPreviewer);

	setupHeadingSyncEventHandling();

	function setupHeadingSyncEventHandling() {
		on("#previewer", "previewed", function(e) {
			if (isEditMode()) {
				var headings = document.getElementById("previewer").contentDocument.body.querySelectorAll("h1, h2, h3, h4, h5, h6");
				for (var i = 0; i < headings.length; i++) {
					// 見出しにイベントを設定する。メモリリーク対策でプレビュー時に
					// イベントを外しやすくするために、on**で実装する。 
					headings[i].onmouseover = function() {
						this.style.cursor = "pointer";
					};
					headings[i].onclick = headingSyncToEditor;
				}
			}
		});
	}
	
	on("#previewer", "prepreview", function(e) {
		var headings = document.getElementById("previewer").contentDocument.body.querySelectorAll("h1, h2, h3, h4, h5, h6");
		for (var i = 0; i < headings.length; i++) {
			headings[i].onmouseover = null;
			headings[i].onclick = null;
		}
	});

	function headingSyncToPreviewer() {
		var editor = document.getElementById("editor");
		var previewer = document.getElementById("previewer").contentDocument.body;
		
		var num = getCurrentNumberOfHeading(editor);
		gotoPreviewerToHeadingPage(previewer, num);
	}

	function headingSyncToEditor(e) {
		var editor = document.getElementById("editor");
		var previewer = document.getElementById("previewer").contentDocument.body;
		var num = getNumberOfHeading(previewer, e.target);
		scrollEditorToHeading(editor, num);
	}

	function getNumberOfHeading(previewer, elem) {
		var headings = previewer.querySelectorAll("h1, h2, h3, h4, h5, h6");
		var i;
		for (i = 0; i < headings.length; i++) {
			if (headings[i] == elem) {
				break;
			}
		}
		return i + 1;
	}

	function scrollEditorToHeading(editor, num) {
		var value = editor.value;
		var processedLines = processForHeadingSync(value, value.length);

		
		var headingCount = 0;
		var i;
		for (var i = 0; i < processedLines.length; i++) {
			var line = processedLines[i];
			if (line.match(/^# .+$/)) {
				headingCount++;
				
				if (headingCount == num) {
					break;
				}
			}
		}
		
		var j = 0;
		if (i != 0) {
			var lineBreakCount = 0;
			for (j = 0; j < value.length ; j++) {
				var c = value.charAt(j);
				if (c == "\n") {
					lineBreakCount++;
					if (lineBreakCount == i) {
						j++;
						break;
					}
				}
			}
		}
		
		var end = editor.value.indexOf("\n", j);
		end = (end == -1) ? editor.value.length : end;
		
		editor.selectionStart = j;
		editor.selectionEnd = end;
		updateScrollPos(editor);
		// chromeだとupdateScrollPosのバグで強制的にsaved=trueになってしまう
		// そのため、updateSavedFlagを呼び出して元に戻す。
		// TODO いつか治したい
		updateSavedFlag();
		editor.focus();
	}

	function getCurrentNumberOfHeading(editor) {
		var value = editor.value;
		
		// ==や--によるheadingに対応するため
		// キャレットの次の行まで読み込む
		var length = editor.selectionStart;
		var lineBreakCount = 0;
		while ((length < value.length) && (lineBreakCount < 2)) {
			if (value.charAt(length) == "\n") {
				lineBreakCount++;
			}
			length++;
		}
		length--;
		
		var processed = processForHeadingSync(value, length);
		if ((lineBreakCount == 2)
				&& processed[processed.length - 1].match(/^#{1,6}\s(.+)$/)) {
			// キャレットの次の行がheadingだったらそれは捨てる
			processed.pop();
		}
		return processed.join().split("# ").length - 1;
	}

	function gotoPreviewerToHeadingPage(previewer, numberOfHeading) {
		if (numberOfHeading == 0) {
      slideshow.gotoFirstSlide();
		} else {
			var hElems = previewer.querySelectorAll("h1, h2, h3, h4, h5, h6");
			var elem = hElems[numberOfHeading - 1];
      var slideNumberDiv = elem.parentNode.querySelector('.remark-slide-number');
      var slideNumber = slideNumberDiv.innerText.split('/')[0].trim() - 0; // ページ番号 (1 / 5) の前の部分だけ抽出してる
      
      slideshow.gotoSlide(slideNumber);
		}
	}

	function processForHeadingSync(str, length) {
		var text = str.substring(0, length);
		var lines = text.split("\n");
		var newLines = [];
		
		var style = editor.currentStyle 
				|| document.defaultView.getComputedStyle(editor, '');
		var tabSize = style.tabSize
					|| style.MozTabSize
					|| 8;
		tabSize = Number(tabSize);
		
		var tildeCodeBlockFlag = false;
		var backQuoteCodeBlockFlag = false;
		var i;
		for (i = 0; i < lines.length; i++) {
			var line = lines[i];
			// 行頭にtabSize以上のスペースがある行は削除
			line = line.replace(new RegExp("^ {" + tabSize + ",}.*"), "");
			// 行頭にtabがある行は削除
			line = line.replace(/^\t+.*/, "");
			// trim
			line = line.replace(/^\s+|\s+$/g, "");
			// 行頭のblockquoteは削除
			line = line.replace(/^\s*(>\s*)+/, "");
			
			if (tildeCodeBlockFlag == true) {
				if (line == "~~~") {
					tildeCodeBlockFlag = false;
				}
				newLines.push("");
				continue;
			}
			if (backQuoteCodeBlockFlag == true) {
				if (line == "```") {
					backQuoteCodeBlockFlag = false;
				}
				newLines.push("");
				continue;
			}
			
			if (line.substring(0, 3) == "~~~"){
				tildeCodeBlockFlag = true;
				newLines.push("");
				continue;
			}
			if (line.substring(0, 3) == "```"){
				backQuoteCodeBlockFlag = true;
				newLines.push("");
				continue;
			}
			
			if (line.match(/^-{2}$/)) {
				// remark は -- でページ切り替えになるので、ダミーの Heading を追加して帳尻を合わせる
				newLines.push('# dummy');
				continue;
			}

			if (line.match(/^#{1,6}\s(.+)$/)
				|| line.match(/^<h[1-6]>(.*)$/)) {
				newLines.push("# " + RegExp.$1);
				continue;
			}
			
			newLines.push(line.replace(/#/g, ""));
		}

		return newLines;
	}

	function updateScrollPos(editor) {
		// 初期状態を保存
		var text = editor.value;
		var selectionStart = editor.selectionStart;
		var selectionEnd   = editor.selectionEnd;

		// insertTextコマンドで適当な文字(X)の追加を試みる
		var isInsertEnabled;
		try {
			isInsertEnabled = document.execCommand("insertText", false, "X");
		} catch(e) {
			// IE10では何故かfalseを返さずに例外が発生するのでcatchで対応する
			isInsertEnabled = false;
		}
		
		if (isInsertEnabled) {
			// insertTextに成功したらChrome
			// chromeはどう頑張ってもまっとうな手段が通用しない。
			// 苦肉の策としてselectionStart,endを揃えてから
			// 一旦フォーカスを外してすぐに戻す。そうするとスクロールバーが追従する
			// これにより、chromeではblurやfocusイベントはまともに使えなくなる黒魔術
			editor.value = text;
			editor.selectionStart = selectionStart;
			editor.selectionEnd = selectionStart;
			editor.blur();
			editor.focus();
			
			// valは戻してあるのでキャレット位置のみ元に戻す
			editor.selectionStart = selectionStart;
			editor.selectionEnd = selectionEnd;
		} else {
			// IE,FirefoxはinsertTextに失敗するのでval関数で適当な文字(X)を挿入する。
			// IEではその後にその文字を選択してdeleteコマンドで削除するとスクロールバーが追従する
			var part1 = text.substring(0, selectionStart);
			var part2 = text.substr(selectionEnd);
			editor.value = part1 + "X" + part2;
			editor.selectionStart = part1.length;
			editor.selectionEnd = part1.length + 1;
			var isDeleteEnabled = document.execCommand("delete", false, null);
			
			// 追従した後はvalとキャレットを元に戻す
			editor.value = text;
			editor.selectionStart = selectionStart;
			editor.selectionEnd = selectionEnd;
		}
	}
	
	/* Markdown, CSS切り替え */
	on("#markdownTab", "click", function(e) {
		e.preventDefault();
		showMarkdown();
		return false;
	});
	
	on("#cssTab", "click", function(e) {
		e.preventDefault();
		showCss(e);
		return false;
	});
	
	function showMarkdown() {
		var markdownTab = document.querySelector("#markdownTab").parentNode;
		addClass(markdownTab, "selected");
		var editor = document.querySelector("#editor");
		showBlock(editor);
		editor.focus();
		
		var cssTab = document.querySelector("#cssTab").parentNode;
		removeClass(cssTab, "selected");
		var cssEditor = document.querySelector("#cssEditor");
		hide(cssEditor);
	}
	
	function showCss() {
		var markdownTab = document.querySelector("#markdownTab").parentNode;
		removeClass(markdownTab, "selected");
		var editor = document.querySelector("#editor");
		hide(document.querySelector("#editor"));
		
		var cssTab = document.querySelector("#cssTab").parentNode;
		addClass(cssTab, "selected");
		var cssEditor = document.querySelector("#cssEditor");
		showBlock(cssEditor);
		cssEditor.focus();
	}
	
	function addAttachEditLayer(fileName, content) {
		var script = document.createElement("script");
		script.type  = "text/template";
		script.className = "editLayer";
		script.innerHTML = content;
		
		var attach = document.getElementById("attach-" + fileName);
		var parent = attach.parentNode;
		parent.insertBefore(script, attach.nextSibling);
	}
	
	/* 画面キャプチャ貼り付け */
	// Chrome向け
	on("#pasteArea", "paste",function(e){
		if (!e.clipboardData || !e.clipboardData.types) {
			return true;
		}
		
		var fileFlag = false;
		for (var i=0; i < e.clipboardData.types.length; i++) {
			if (e.clipboardData.types[i] == "Files") {
				fileFlag = true;
				break;
			}
		}
		if (fileFlag == false) {
			return true;
		}
		
		e.preventDefault();
		for (var i = 0; i < e.clipboardData.items.length; i++) {
			attachFile(e.clipboardData.items[i].getAsFile(), "clipboard");
		}
		return false;
	});
	
	// FF, IE向け
	on("#pasteArea", "keyup",function(e){
		e.preventDefault();
		
		var dummyElement = document.createElement("div");
		dummyElement.innerHTML = this.innerHTML;
		var imgElement = dummyElement.querySelector("img");
		if (imgElement) {
			var base64 = imgElement.src;
			addAttachFileElement("clipboard", base64, "", "", true);
		}
		
		this.innerHTML = "ここをクリックしてCtrl+V(Cmd+V)するとクリップボードの画像を添付できます。";
		return false;
	});
	
	/* ショートカットキー */
	on("body", "keydown", shortcutKey);
  on(document.getElementById('previewer').contentDocument.body, 'keydown', shortcutKey);
  
  function shortcutKey(event) {
		var code = (event.keyCode ? event.keyCode : event.which);
		
		if (isDrawMode()) {
			if (code == 83 && (event.ctrlKey || event.metaKey)){
				event.preventDefault();
				return false;
			} else {
				return true;
			}
		}
		
		if (code == 27) {
			// ESCキー
			event.preventDefault();
			
			var onlineMenu = document.getElementById("onlineMenu");
			if (isVisible(onlineMenu)) {
				// オンラインメニュー閉じる
				hide(onlineMenu);
			} else {
				// 閲覧/編集モード切り替え
				var toggleButton = document.getElementById("toggleButton");
				if (isEnable(toggleButton)) {
					toggleButton.click();
				}
			}
			return false;
		}
		
		
		if (code == 83 && (event.ctrlKey || event.metaKey)){
			// CTRL+Sで保存する
			event.preventDefault();
			
			var saveButton = document.getElementById("saveButton");
			if (isEnable(saveButton)) {
				saveButton.click();
			}
			return false;
		}
		
		if (code == 116 ||
				((code == 82) && (event.ctrlKey || event.metaKey))){
			// F5 or Ctrl + Rでエディタとプレビューアを同期
			event.preventDefault();
			
			var syncButton = document.getElementById("syncButton");
			if (isEnable(syncButton)) {
				syncButton.click();
			}
			return false;
		}
		
		if (code == 112){
			// F1でヘルプ
			event.preventDefault();
			
			var helpButton = document.getElementById("helpButton");
			helpButton.click();
			
			return false;
		}

		if ((code == 37) && event.altKey) {
			// Alt+←
			event.preventDefault();
			openPreview();
			return false;
		}

		if ((code == 38) && event.altKey) {
			// Alt+↑
			event.preventDefault();
			closeFiler();
			return false;
		}

		if ((code == 39) && event.altKey) {
			// Alt+→
			event.preventDefault();
			closePreview();
			return false;
		}
		
		if ((code == 40) && event.altKey) {
			// Alt+↓
			event.preventDefault();
			openFiler();
			return false;
		}
		
		if (code == 113) {
			// F2で見出し同期（エディタ→プレビューア）
			event.preventDefault();
			
			var headingSyncButton = document.getElementById("headingSyncButton");
			headingSyncButton.click();
			
			return false;
		}
		
		return true;
	};
	
	function isEditMode() {
		return isVisible(document.querySelector("#editorTabWrapper"));
	}
	
	function isDrawMode() {
		return document.querySelector("body").classList.contains("drawMode");
	}
	
	function isEnable(elem) {
		return elem &&
				((typeof elem.disabled === "undefined")
				|| (elem.disabled == false));
	}

	function isVisible(elem) {
		var style = elem.currentStyle || document.defaultView.getComputedStyle(elem, '');
		if (style.display == "none") {
			return false;
		}
		var parent = (elem.tagName.toLowerCase() == "body") ? null : elem.parentNode;
		if (!parent) {
			return true;
		} else {
			return isVisible(parent);
		}
	}

	function showBlock(elem) {
		elem.style.display = "";
		if (!isVisible(elem)) {
			elem.style.display = "block";
		}
	}

	function hide(elem) {
		elem.style.display = "";
		if (isVisible(elem)) {
			elem.style.display = "none";
		}
	}
	
	function addClass(elem, className) {
		elem.classList.add(className);
	}
	
	function removeClass(elem, className) {
		elem.classList.remove(className);
		if (elem.className == "") {
			elem.removeAttribute("class");
		}
	}


