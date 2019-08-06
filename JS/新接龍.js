window.onload = function () {
    var c = console.log;
    //開場
    $("header").delay(6000).fadeOut(3000);
    //用start紀錄是否已經開始
    var start = false;
    //用moves來記錄移動次數
    var moves = 0;
	//用saveArray儲存這局的原始卡牌位置
	var saveArray = [];
	//定義一個變量讓被拿取卡牌的z-index越來越大，能夠覆蓋其他卡牌
	var zIndex = 1;
    //定義一個 Card類
    function Card(suit, num) {
        //suit: 花色, num: 數字, id: 對應的DOM的id, color: 顏色
        this.suit = suit;
        this.num = num;
        this.id = suit + "_" + num;
        if (suit === "heart" || suit === "diamond") {
            this.color = "red";
        } else {
            this.color = "black";
        };
    };
    //從DOM元素轉換為對應的Card物件的函數
    function toCard($t) {
        return eval($t.attr("id"))
    };
    //新開一局的函數
    function newGame() {
		//初始化前先確定start為false，saveArray為空
		start = false;
		saveArray = [];	
		//創建club1 ~ spade13 代表各張撲克牌
		var suitArray = ["club", "diamond", "heart", "spade"];
		//用cardArray來裝填所有的Card物件
		var cardArray = [];
		suitArray.forEach(function (item) {
			for (var i = 1; i <= 13; i++) {
				//window.club_1 = new Card(club, 1);...
				var str = ("window." + item + "_" + i + "= new Card('" + item + "'," + i + ");");
				eval(str);
				//cardArray.push(club_1);...
				var str2 = "cardArray.push(" + item + "_" + i + ")";
				eval(str2);
			}
		});
		//初始化的函數
        var i = 0;
        var interval = 50;
        function initialization(i) {
            //從cardArray中隨機選一張牌
            var randInt = parseInt(Math.random() * cardArray.length) //0~51
            //將牌「抽出來」(起始值, 去除數量) **注意：splice函數會將該item真的從cardArray中移除並返回一個只有該item的Array，所以是真的「抽出來」
            var selectedCard = cardArray.splice(randInt, 1)[0];
            //將抽出的牌依序放入cardColumn中
            var j = i % 8;
            $(".cardColumn").eq(j).append('<div class="card" id="' + selectedCard.id + '" style="background-image: url(images/52cards/' + selectedCard.id + '.png)"></div>');
            //此卡牌的elem屬性指向剛創建的DOM元素
            selectedCard.elem = $("#" + selectedCard.id);
            //將dragElement函數套用於此DOM元素上
            dragElement(selectedCard.elem);
			//儲存卡牌抽出的順序
			saveArray.push(selectedCard);
            //回調自身(i==51時，已經走了52次，此時停止遞迴呼叫)
            if (i < 51) {
                setTimeout(function () { initialization(i + 1); }, interval);
            } else {
                //發牌完成，遊戲開始計時
                timeStart();
                start = true;
				//刪除初始化使用的定時器
				clearTimeout(timerInit);
            };
        };
        var timerInit = setTimeout(function () { initialization(i); }, interval);
    };
    //等開場動畫結束後才初始化
    setTimeout(newGame, 9000);
    //用以獲得元素CSS相關數值的函數(返回整數值)
    // 1. 創造一個函數產生器對象
    var functionGenerator = {
        h: "height",
        w: "width",
        pl: "padding-left",
        pr: "padding-right",
        pt: "padding-top",
        pb: "padding-bottom",
        ml: "margin-left",
        mr: "margin-right",
        mt: "margin-top",
        mb: "margin-bottom",
        l: "left",
        r: "right",
        t: "top",
        b: "bottom"
    };
    // 2. 批量製造如下函數：
    //function $gh(str) {
    //    return parseInt($(str).css("height"))
    //};
    for (var key in functionGenerator) {
        let str = `function $g${key}(str){
            return parseInt($(str).css("${functionGenerator[key]}"))
        };`
        eval(str);
    };
    //拖曳目標元素的函數
    function dragElement(target) {
        var $t = $(target);
        var $p = $("#playArea");
        var $col = $(".cardColumn").eq(0);
        var $cf = $("#cardFolder");
        //在目標上按下滑鼠左鍵
        $t.mousedown(function (event) {
            //若遊戲尚未開始(初始化尚未完成)，則無法移動卡牌
            if (!start) { return };
			//檢查是否符合移動規則，不符合則強制退出，並用cardCount記錄移動張數
			var cardCount = takeCardCheck($t);
            if (cardCount == "overtake") {
                $("#warning").text("Foul: Now you can only move " + maxTakeCheck() + " cards at a time");
                //將目標變透明
                $t.css("opacity", 0.25);
                return
            } else if (cardCount == "foul") {
                $("#warning").text("Foul: Can NOT move this card now -- " + $t.attr("id"));
                //將目標變透明
                $t.css("opacity", 0.25);
                return
            } else {
                //無違規移動情形，將警告文字刪除
                $("#warning").text("");
            }
            //移動開始，將目標及其下方卡牌的z-index調到最大，才不會被其他卡牌遮住，同時消除transition以免移動卡頓
            changeCards($t, cardCount, function(card, i){
				card.css("z-index", zIndex++).css("transition", "none");
			});
            //取得當前滑鼠offset值(在移動中必須固定)
            var mouseOffset = [event.offsetX, event.offsetY];
            //先定義left及top，在放開滑鼠時的事件會用到，並且先賦值為當前的left及top值，以免後面while判斷式進入undefined的死循環
            var left = $gl($t);
            var top = $gt($t);
            //在main中進行移動
            $p.on("mousemove", function (event) {
                //移動目標
                left = event.pageX - $gml("main") - mouseOffset[0];
                top = event.pageY - $gmt("main") - mouseOffset[1];
                //移動不能超過$p的範圍
                var maxLeft = $gw($p) - $gw($t);
                var maxTop = $gh($p) - $gh($t);
                if (left <= 0) {
                    left = 0;
                } else if (left >= maxLeft) {
                    left = maxLeft;
                };
                if (top <= 0) {
                    top = 0;
                } else if (top >= maxTop) {
                    top = maxTop;
                };
				//改變目標及目標下方卡牌位置
				changeCards($t, cardCount, function(card, i){
					card.css("left", left + "px").css("top", top + (44 * i) + "px");
				});
            });
            //在window中放開滑鼠
            $(window).on("mouseup", function () {
                //完成移動，先將目標及其下方卡牌的transition恢復原狀
                changeCards($t, cardCount, function(card, i){
					card.css("transition", "");
				});
                /* 調整目標的X座標：
                 * 以標準狀況來說的分界線是在60+110+(25/2), +110+25, +...
                 * 是用left+55 去對(目標卡牌的中心點X座標)
                 * 也就是若left+55 < 60+110+(25/2)為第一排, left+25 < 60+110+(25/2) + (110+25)*1 為第二排
                 * 全部用對應的變數去換則是：
                 * left+ $gw($col)/2 < $gpl($cf) + $gw($col) + $gml($col)/2
                 * 間隔為$gw($col) + $gmr($col)
                 * 移項過後變成：
                 * left < $gpl($cf) + ($gw($col) + $gmr($col))/2
                 * 間隔為$gw($col) + $gmr($col)
                 * 所以寫一個迴圈來判斷
                 * threshold: 閾值，也就是區分卡牌要放到第幾排的分界值
                 * interval: 間隔，每個閾值之間的間隔
                 * count: 用來數走了幾個interval
                 */
                var threshold = $gpl($cf) + ($gw($col) + $gmr($col)) / 2;
                var interval = $gw($col) + $gmr($col);
                var count = 0;
                while (true) {
                    //第一次比較時threshold為60+55=115，第二次為115+135*1...
                    if (left < threshold) {
                        //left小於閾值時，left值應為60+135*count才能對齊
                        left = $gpl($cf) + interval * count;
                        changeCards($t, cardCount, function(card, i){
							card.css("left", left);
						});
                        break;
                    } else {
                        threshold += interval;
                        count++;
                    };
                };
               /* 調整目標的Y座標：
                * 先判斷卡牌的中心點Y座標有沒有低於gameInfo + cardSpace的高度
                * 若低於此則將卡牌置於cardSpace中
                * 高於此則置於cardFolder
                * 且進一步做更複雜的判斷
                */
                //將目標的top值清空才能吃到space的預設值
                changeCards($t, cardCount, function(card, i){
					card.css("top", "");
				});
                //此時若count == 0 表示目標位置為第一欄， count == 1 表示目標位置為第二欄...
                if (top + $gh($t) / 2 <= $gh("#gameInfo") + $gh("#cardSpace")) {
                    //移動至cardSpace中的某欄
                    var $newPlace = $("#cardSpace>div:nth-child(" + (count + 1) + ")");
                } else {
                    //移動至cardColumn中的某欄
                    var $newPlace = $cf.find("div.cardColumn:nth-child(" + (count + 1) + ")");
                };
				//將將所有卡牌的top及left值清除(如果接下來因為違規而沒有被移動，就會回到原來位置)
				changeCards($t, cardCount, function (card, i) {
					card.css("top", "").css("left", "");
				});
                //檢查此放置行動是否符合規則
                if (placeCardCheck($t, $newPlace, cardCount)) {
                    //符合規則，先將目標的原來位置做記錄
                    record($t, cardCount);
                    //調用card移動函數將目標及其下方卡牌移至新位置
                    changeCards($t, cardCount, function (card, i) {
                        moveCardDiv(card, $newPlace);
                    });
                    //增加移動次數記錄
                    moves++;
                    //刷新移動次數資訊
                    movesRefresh();
                };
                //移除main的mousemove事件
                $p.off("mousemove");
                //移除window的mouseup事件
                $(window).off("mouseup");
                //保留window消除透明卡牌的mouseup事件
                $(window).on("mouseup", function () {
                    $(".card").css("opacity", "");
                });
            });
        })
    }
    //滑鼠放開後，所有卡牌都變為不透明(消除違規移動時的卡牌透明化效果)
    $(window).on("mouseup", function () {
        $(".card").css("opacity", "");
    });
	//移動次數改變時刷新相關資訊的函數
	function movesRefresh(){
		//若遊戲尚未開始則無法調用
		if (!start){return};
		//改變右上方記錄的Moves次數
        $("#moves").text(moves + " Moves");
        //若moves == 1，則啟用undo功能
        if (moves == 1) {
            $(".undo").css("opacity", 1);
        } else if (moves == 0) {
            $(".undo").css("opacity", "");
        }

	};
	//將card在DOM樹中移動的函數
    function moveCardDiv($t, $newPlace) {
        //新製造一個複製品
        var $tClone = $t.clone(false);
		//此對應卡牌的elem屬性指向這個複製品
		var card$t = toCard($t);
        card$t.elem = $tClone;
		//將原目標刪除
        $t.remove();
		//將複製品移至目標位置
        $newPlace.append($tClone);
        //重新幫$tClone綁定dragElement
        dragElement($tClone);
    };
	//拿取目標元素時檢測規則的函數(count記錄總共拿幾張卡)
    function takeCardCheck($t, count = 1) {
        //每一圈都檢查是否超過最大可拿取數量，如果超過就返回"overtake"
        if (count > maxTakeCheck()) { return "overtake" };
		//目標後面沒有任何card，可以移動並返回總張數
		if ($t.next().length == 0){
			return count
		}
		//目標後面有card，進行判斷
		else{
			//取得目標對應的card物件
            var card$t = toCard($t);
			//取得下一張卡牌的card物件
            var card$tNext = toCard($t.next());
			//比較兩張卡牌的顏色和數字是否符合規則
			if (card$t.color != card$tNext.color && card$t.num - 1 == card$tNext.num){
				//符合規則，繼續往下檢查
				count++;
				return takeCardCheck($t.next(), count)
            } else {
                //犯規，返回"foul"
				return "foul"
			};
		};
	};
	//改變目標卡牌本身以及下方所有卡牌的函數
	function changeCards($t, cardCount, func){
		for (var i=0; i<cardCount; i++){
			//先將錨點cur指向$t.next()，以免在進行像是moveCard這樣會刪除元素的操作時找不到next()
			var cur = $t.next();
			//將$t及i丟入func中執行
			func($t, i);
			//$t指向其原先next()物件
			$t = cur;
		};
	};
    //放置目標元素時檢測規則的函數
    function placeCardCheck($t, $newPlace, cardCount) {
        //透過$newPlace的class值來判斷是放到哪種區塊
        var p = $newPlace.attr("class");
        //獲取新位置最後一張卡的card對象
        var cardLast = toCard($newPlace.find("div.card:last-child"));
        //獲取$t的card對象
        var card$t = toCard($t);

        //若放到cardColumn
        if (p == "cardColumn") {
            //如果新位置沒有任何卡(cardLast == undefined)，返回true
            if (!cardLast) { return true };
            //進行規則檢查
            if (cardLast.color != card$t.color && cardLast.num - card$t.num == 1) {
                return true
            } else {
                //測試時將這裡修改為true就可以隨意移動卡牌
                return false
            };
        }
        //若放到左上方space
        else if (p == "space") {
            //判斷是否拿了一張以上的卡片，如果有，返回false
            if (cardCount > 1) { return false };
            //判斷裡面是否有任何卡片
            if ($newPlace.find(".card").length) {
                //有卡片，返回false
                return false
            } else {
                return true
            }
        }
        //若放到右上方scoreArea
        else {
            //判斷是否拿了一張以上的卡片，如果有，返回false
            if (cardCount > 1) { return false };
            //如果新位置沒有任何卡(cardLast == undefined)，則只能放入A
            if (!cardLast) {
                if (card$t.num == 1) {
                    return true
                } else {
                    return false
                }
            } else {
                //有卡牌，進行規則檢查
                if (cardLast.suit == card$t.suit && cardLast.num == card$t.num - 1 ) {
                    return true
                } else {
                    return false
                };
            };
        }
    };
    //檢查目前最大可拿取數量的函數
    function maxTakeCheck() {
        //找出所有為空的space元素
        var emptySpace = $(".space:empty").length;
        //找出所有為空的cardColumn元素
        var emptyCardColumn = $(".cardColumn:empty").length;
        //返回最大可拿取數量
        return (emptySpace + 1) * (emptyCardColumn + 1)
    };
    //開始計算時間的函數(先在外部定義相關方法讓其他部分可以調用)
	var startGameTimer, pauseGameTimer, resetGameTimer
    function timeStart() {
        var sec = 0;
        var min = 0;
		//給window添加一個開始計時的方法
		startGameTimer = function(){
			//定義並開始計時器
			var gameTimer = setInterval(function () {
				//每一秒sec增加1
				sec++;
				if (sec == 60) {
					min++;
					sec = 0;
				};
				//將時間格式化成01:09這樣的形式
				var formattedTime = (min < 10 ? "0" + min : "" + min) + ":" + (sec < 10 ? "0" + sec : "" + sec);
				$("#time").text(formattedTime);
			}, 1000);
			//給window添加一個暫停計時器的方法
			pauseGameTimer = function () {
				clearInterval(gameTimer);
			};
			//給window添加一個重置時間的方法(重新開始遊戲時會使用)
			resetGameTimer = function () {
				clearInterval(gameTimer);
				sec = 0;
				min = 0;
				//立即重置時間資訊
				$("#time").text("00:00");
			};
		};
		//在遊戲初始化完成後開始計時
		startGameTimer();
    };
	//點擊「新遊戲」
	$(".new_game").click(function(){
		//移除所有卡牌
		$(".card").remove();
		//調用遊戲初始化函數
		newGame();
		//移動次數重置
		moves = 0;
		movesRefresh();
		//計時器重置
		resetGameTimer();
	});
	//點擊「重新開始」
	$(".restart").click(function(){
		//移動次數重置
		moves = 0;
        movesRefresh();
        //將所有卡牌的z-index重設
        $(".card").css("z-index", "");
        zIndex = 1;
		//改變start狀態
		start = false;
		//計時器重置
		resetGameTimer();
        var i = 0;
        var interval = 50;
        function restart(i) {
            var j = i % 8;
			//輪流取得cardColumn各個直行做為新位置
			var $newPlace = $(".cardColumn").eq(j);
			//取得目標移動物(saveArray中裝的是Card物件，必須調用其elem屬性來取得目標DOM)
			var $t = saveArray[i].elem;
			//調用移動的函數
			moveCardDiv($t, $newPlace);
            //回調自身(i==51時，已經走了52次，此時停止遞迴呼叫)
            if (i < 51) {
                setTimeout(function () { restart(i + 1); }, interval);
            } else {
                //重新發牌完成，遊戲開始計時
                timeStart();
                start = true;
				//刪除初始化使用的定時器
                clearTimeout(timerRestart);
            };
        };
        var timerRestart = setTimeout(function () { restart(i); }, interval);
    });
    //儲存遊戲過程的函數(需傳入移動張數cardCount)
    var recArray = [];
    function record($t, cardCount) {
        //取得目標id字串
        var idStr = $t.attr("id");
        //取得目標目前位置
        var $origin = $t.parent();
        //將資料存入陣列中
        recArray.push([idStr, $origin, cardCount])
    }
	//按下「undo」
    $(".undo").click(function () {
        //若moves為0則返回
        if (!moves) { return };
        //取出recArray中最後一筆紀錄
        var dataArray = recArray.pop();
        //取得id及原來位置、移動張數
        var idStr = "#" + dataArray[0];
        var $origin = dataArray[1];
        var cardCount = dataArray[2];
        //移動並增加z-index
        changeCards($(idStr), cardCount, function ($t, i) {
            $t.css("z-index", zIndex++);
            moveCardDiv($t, $origin);
        });
        //更新移動次數
        moves --;
        movesRefresh();
    });






    ////測試用按鈕
    //$("#btn1").click(function () {
    //    c(toCard($("#club_1")));
    //});
    //$("#btn2").click(function () {
    //    startGameTimer();
    //});

};