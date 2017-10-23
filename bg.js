var executionInProgress = false;
var victimUrlArray = null;
var sitePrefix = null;

chrome.runtime.onConnect.addListener(function(port) {
	//
	//слушаем сообщения от контентного скрипта remover.js
	//
	port.onMessage.addListener(function(msg) {
		//
		//инициализация
		//
		if (msg.type === 'initVictims') {
			executionInProgress = true;
			victimUrlArray = msg.rawTxt.replace(/^\s+|\s+$/g, '').split('\n');

			if(sitePrefix != null)
				var victimUrl = sitePrefix+victimUrlArray.shift();
			else
				var victimUrl = victimUrlArray.shift();
			port.postMessage({
			'type' : 'removeUrl',
			'victim': victimUrl
			});
			//
			//обработка запроса следующего URL
			//
		} else if (msg.type === 'nextVictim') {
			// Выдаём следующий URL
			if (executionInProgress) {
				 if(sitePrefix != null)
						var victimUrl = sitePrefix+victimUrlArray.shift();
					else
						var victimUrl = victimUrlArray.shift();

				if (victimUrl !== undefined) {
					port.postMessage({
						'type' : 'removeUrl',
						'victim': victimUrl
					});
				} else {
					executionInProgress = false; 
					victimUrlArray = null;
					port.postMessage({
						'type' : 'done',
						'executionInProgress' : executionInProgress
				});
				}
			} else {
				port.postMessage({
					'type' : 'done',
					'executionInProgress' : executionInProgress
				});

			}
		} else if (msg.type == 'askState') {
			port.postMessage({
				'type' : 'state',
				'executionInProgress' : executionInProgress
			});
		}
		else if (msg.type == 'setState'){
			if(msg.execution === 'false')
			{
				executionInProgress = false;
			}
		}
		else if (msg.type == 'setPrefix'){
			sitePrefix = msg.prefix;
		}
	});
});


