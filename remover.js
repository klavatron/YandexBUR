document.body.style.border = "5px solid green"; //добавляем рамочку, чтобы было видно, что скрипт работает
const CSS = '<style type="text/css"> input#del-url-prefix:focus { border: 2px solid #ffdb4d !important; outline: none;} </style>';

$(document).ready(function(){
	console.log("YandexBUR на связи"); 
	$("head").append(CSS);
	var click_try = 3; //если не произошел клик с первого раза, даём пару попыток
	var timer = null; //если клик не прошел, ждем и кликаем снова
	var state = false; //запущено ли выполнение
	$("div.del-url__form").append('<div class="del-url__form-notification-list" style="margin-top:40px;"><ul class="notification-list" style="color:green;"></ul></div>');
	var $fileInput = $('<p class="content__subtitle" style="margin-top: 20px;">Укажите CSV файл с данными</p><input id="fileInput" style="display: block;  margin-top: 30px;" type="file" />');
	var location1 = window.location.pathname.split('/')[2];
	//если сайт с поддоменом, то скорее всего будет кривое отображение...но это пока не важно
	var siteProtocol = location1.split(':')[0];
	var siteName = location1.split(':')[1];
	var sitePrefix = ""+ siteProtocol+"://"+ siteName +"";

	var $stopButton = $('<button id="del-url-stop-btn" class="button button_side_right button_theme_action button_align_left button_size_m one-line-stop form__stop i-bem button_js_inited" type="button" autocomplete="off" ><span class="button__text" aria-hidden="true">Остановить</span></button>')
	var $prefix = $('<div class="del-url-extra" style="width:410px;display: inline-block;"><p class="content__subtitle" style="margin-top: 20px;">Префикс, при необходимости</p><input type="text" id="del-url-prefix" name="del-url-prefix" value="" placeholder="'+sitePrefix+ '" style="border: 1px solid rgba(0,0,0,.2);height: 32px;    padding-left: 10px;    font-size: 14px; width:100%;     box-sizing: border-box;"/></div>');
	$(".form_of_del-url").append($prefix);
	$(".form_of_del-url").append($stopButton);
	$(".form_of_del-url").append($fileInput);

	var port = chrome.runtime.connect({name: "victimPort"});
	
	//
	//слушаем сообщения от фонового скрипта bg.js
	//
	port.onMessage.addListener(function(msg) {
		if(typeof(msg.type) != "undefined" && msg.type === 'removeUrl') {
			state = true;
			var victim = msg.victim;
			// вставляем нашу ссылку и кликаем удалить
			$("input[name='url']").attr('value', victim);
			$(".form__submit").trigger("click");
			click_try-=1;
			
			//
			// если клик не произошел с первого раза, ждём 5000 мс и делаем еще клик
			if(state){
				timer = setTimeout(function() {
					//console.log("Инициализация таймера.");
					if(click_try<3 && click_try>=0){ //даём пару попыток
						$(".form__submit").trigger("click");
						click_try-=1;
					}
				}, 5000);
			}
		}
		else if(typeof(msg.type) != "undefined" && msg.type === 'done') {
			state = msg.executionInProgress;
			$(".del-url__form-notification-list").prepend('<h2 class="notification-header" color="green">Готово!</h2>');
			console.log("Задание выполнено");
		}
		else if(typeof(msg.type) != "undefined" && msg.type === 'state') {
			state = msg.executionInProgress;
		}
		else{
			console.log("Произошло что-то непонятное"); 
		}
	});

//
//в случае получения уведомления, об успешности добавления, скрываем его, 
//очищаем строку и запрашиваем следующий URL 
//
	$(".form_of_del-url").on("DOMNodeInserted", function (event) { 

		//console.log("Обнаружено внедрение DOM-объекта");
		var notificationContent = $(".notification-message_type_success").find("div.notification-message__content").html();

		if(typeof(notificationContent)!="undefined" && notificationContent === "URL успешно добавлен в очередь на удаление"){
			click_try = 3;
			//у нас всё Ок, так что, если работает таймер - удаляем его
			if (timer) {
				clearTimeout(timer); 
			timer = null;
			}

			$(".notification-list").append("<li>"+ $("input[name='url']").val().toString()) + "</li>";
			$(".notification-message_type_success").remove();
			$("input[name='url']").attr('value', "");
			
			port.postMessage({
				'type': 'nextVictim'
			});
		}
		else if(typeof(notificationContent)!="undefined" && notificationContent === "Сегодня вся квота израсходована"){
			console.log("лимит квот достигнут");
			if (timer) {
				clearTimeout(timer); 
			timer = null;
			}
			port.postMessage({
				'type': 'setState',
				'execution': 'false'
				});
		}
		else if(typeof(notificationContent)!="undefined" && notificationContent != "" && notificationContent != null){
			console.log("Сообщение особое: " + notificationContent);
		}
	});

//
//при выборе файла, читаем его по строкам, с пересылкой полученных данных в фоновый скрипт, 
//а также указываем о неоходимости инициализации
//
	$("#del-url-stop-btn").click(function(){
		state=false;
		if (timer) {
			clearTimeout(timer); 
		timer = null;
		}
			port.postMessage({
				'type': 'setState',
				'execution': 'false'
				});
		//как сделать кнопку серой, пока скрипт не запущен, не пойму
		//$("#del-url-stop-btn:before").css({"background-color: ":"#dbdbdb; !important"});
	});
	$fileInput.change(function() {
		//Очищаем вывод сообщений, если это не первый запуск
			$(".notification-list").empty();
			$(".notification-header").empty();
			sitePrefix = $("#del-url-prefix").val();
			port.postMessage({
				'type': 'setPrefix',
				'prefix': sitePrefix
			});
		//Получен файл
		$.each(this.files, function(i, f) {
			var reader = new FileReader();
			reader.onload = (function(e) {
				var rawTxt = e.target.result;
				var victimArry = rawTxt.split('\n');
				port.postMessage({
				'type': 'initVictims',
				'rawTxt': rawTxt
				});

			});
			reader.readAsText(f);
		});
	});

	port.postMessage({
		type: 'askState'
	});

});
