window.onload = function () {
    var c = console.log;
    //寫入<style>：cardColumn中的每張牌的top值
    var styleStr = "";
    for (var i = 1; i <= 19; i++) {
        styleStr += ".cardColumn div:nth-child("+ i +"){top: "+ (281 + 44 * i)+"px;}"
    };
    $("style").text(styleStr);
    //開場
    $("header").delay(6000).fadeOut(3000);
    //用start紀錄是否已經開始
    var start = false;
    //用moves來記錄移動次數
    var moves = 0;
	//用cardArray來裝填所有的Card物件
	var cardArray = [];
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
	//創建club1 ~ spade13 代表各張撲克牌
	var suitArray = ["club", "diamond", "heart", "spade"];
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
    //從DOM元素轉換為對應的Card物件的函數
    function toCard($t) {
        return eval($t.attr("id"))
    };
	//初始化的函數
	function initialization(i, interval, arr) {
		//改變NEW及RESTART透明度
		$(".new_game").css("opacity", 0.25);
		$(".restart").css("opacity", 0.25);
		//若傳入的arr為saveArray，表示是按下restart
		if (arr != saveArray){
			//隨機產生一個51以下的整數
			var randInt = parseInt(Math.random() * arr.length) //0~51
			//將牌「抽出來」(起始值, 去除數量) **注意：splice函數會將該item真的從arr中移除並返回一個只有該item的Array，所以是真的「抽出來」
			var selectedCard = arr.splice(randInt, 1)[0];
		}else{
			var selectedCard = arr[i];
		};
		//將抽出的牌依序放入cardColumn中
		var j = i % 8;
		$(".cardColumn").eq(j).append('<div class="card" id="' + selectedCard.id + '" style="background-image: url(images/52cards/' + selectedCard.id + '.png); left: '+ (60) +'px; top: '+(120-i)+'px; z-index: '+ i +';"></div>');
		//此卡牌的elem屬性指向剛創建的DOM元素
		selectedCard.elem = $("#" + selectedCard.id);
		//將dragElement函數套用於此DOM元素上
		dragElement(selectedCard.elem);
		//儲存卡牌抽出的順序
		saveArray.push(selectedCard);
		//清除卡牌的left及top值使其移動到應有位置，形成發牌動畫
		setTimeout(function(){
			$("#" + selectedCard.id).css("top", "").css("left", "").css("z-index", "");
		}, interval+(5200-interval*i*2));
		//回調自身(i==51時，已經走了52次，此時停止遞迴呼叫)
		if (i < 51) {
			setTimeout(function () { initialization(i + 1, interval, arr); }, interval);
        } else {
            //等待52個interval(讓牌發出來的時間)後遊戲正式開始
            setTimeout(function () {
                //發牌完成，遊戲開始計時
                timeStart();
                start = true;
                //檢查是否有可自動移動的卡牌
                autoMove();
                //恢復NEW及RESTART透明度
                $(".new_game").css("opacity", "");
                $(".restart").css("opacity", "");
            }, interval*52)
		};
	};
	//新開一局的函數
    function newGame() {
		//初始化前先確定start為false，saveArray為空
		start = false;
		saveArray = [];	
		//給cardArray製造一個複製品
		var cardArrayClone = cardArray.slice();
		//進行初始化
        initialization(0, 50, cardArrayClone);
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
                $("#warning").text("Foul: Can NOT move this card now");
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
				//先記錄放開瞬間的left及top值
				var releaseLeft = left;
				var releaseTop = top;
                //完成移動，先將目標及其下方卡牌的transition恢復原狀
                changeCards($t, cardCount, function(card, i){
					card.css("transition", "");
				});
                /* 從目標的X座標推斷新位置是在哪一欄(直行)：
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
                var align = left;
                while (true) {
                    //第一次比較時threshold為60+55=115，第二次為115+135*1...
                    if (align < threshold) {
                        //align小於閾值時跳出迴圈，什麼都不必做，下面可以透過count得知要移動的位置
                        break;
                    } else {
                        threshold += interval;
                        count++;
                    };
                };
                // 從目標的Y座標得知是在cardSpace還是cardFolder：
                //此時若count == 0 表示目標位置為第一欄， count == 1 表示目標位置為第二欄...
                if (top + $gh($t) / 2 <= $gh("#gameInfo") + $gh("#cardSpace")) {
                    //移動至cardSpace中的某欄
                    var $newPlace = $("#cardSpace>div:nth-child(" + (count + 1) + ")");
                } else {
                    //移動至cardColumn中的某欄
                    var $newPlace = $cf.find("div.cardColumn:nth-child(" + (count + 1) + ")");
                };
                //檢查此放置行動是否符合規則
                if (placeCardCheck($t, $newPlace, cardCount)) {
                    //符合規則，先將目標的原來位置做記錄
                    record($t, cardCount);
                    //調用card移動函數將目標及其下方卡牌移至新位置
                    changeCards($t, cardCount, function (card) {
                        moveCardDiv(card, $newPlace);
                    });
                    //增加移動次數記錄
                    moves++;
                    //刷新移動次數資訊
                    movesRefresh();
                    //進行自動移動
                    autoMove();
                    //檢查是否通關
                    completeCheck();
                } else {
                    //不符合規則，將將所有卡牌的top及left值清除使其回到原先位置
                    changeCards($t, cardCount, function (card) {
                        card.css("top", "").css("left", "");
                    });
                    //0.4秒後將所有卡牌的z-index清除
                    setTimeout(function () {
                        changeCards($t, cardCount, function (card) {
                            card.css("z-index", "");
                        });
                    }, 400);
                }
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
        //取得目標當前位置
        var left = $gl($t);
        var top = $gt($t);
        //給目標寫入當前位置的行內樣式，並增加其z-index
        $t.css("left", left + "px").css("top", top + "px").css("z-index", zIndex++);
        //新製造一個複製品，會保留原目標的top及left值，所以複製品會先留在原位
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
        //設定一個定時器，時間到後$tClone的left及top值清空，形成動畫
        setTimeout(function () {
            $tClone.css("left", "").css("top", "");
        }, 20);
        //0.4秒後消除移動物之z-index(此時移動動畫已完成)
        setTimeout(function () {
            $tClone.css("z-index", "");
        }, 400);
        //重設遊戲區域高度
        heightReset();
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
			//比較兩張卡牌的顏色和數字是否符合規則 測試點：這裡增加||true就可以亂拿一堆卡牌
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
        //測試點：將這裡修改為true就可以隨意堆疊卡牌
        //return true
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
    //點擊「NEW」
    $(".new_game").click(function () {
        //若遊戲尚未開始則返回
        if (!start) { return };
        //讓newGameMsg出現
        $("#newGameMsg").stop().fadeIn(300);
    });
    //點擊「RESTART」
    $("aside .restart").click(function () {
        //若遊戲尚未開始則返回
        if (!start) { return };
        //讓restartMsg出現
        $("#restartMsg").stop().fadeIn(300);
    });
	//點擊「Start A New Game」
	$(".start_a_new_game").click(function(){
		//移除所有卡牌
		$(".card").remove();
		//調用遊戲初始化函數
		newGame();
		//移動次數重置
        moves = 0;
        start = true;
        movesRefresh();
        start = false;
		//計時器重置
		resetGameTimer();
		//讓相關訊息消失(如果有出現)
        $("#completeMsg").stop().fadeOut(100);
        $("#newGameMsg").stop().fadeOut(100);
	});
	//點擊「Restart The Current Game」
    $(".restartBtn").click(function(){
		//若遊戲尚未開始則返回
		if (!start){return};
		//移動次數重置
		moves = 0;
        movesRefresh();
        //將z-index重設
        zIndex = 1;
		//改變start狀態
		start = false;
		//計時器重置
		resetGameTimer();
		//刪除所有卡片
		$(".card").remove();
		//進行初始化
		initialization(0, 50, saveArray);
        //讓相關訊息消失(如果有出現)
        $("#restartMsg").stop().fadeOut(100);
    });
    //點擊「Back To The Current Game」
    $(".backBtn").click(function () {
        //關閉所有提示框
        $("section").stop().fadeOut(100);
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
        //用來記錄該undo是否是在autoMove之後發生
        var autoMoveFlag = false;
        //若moves為0或遊戲尚未開始則返回
        if (!moves || !start) { return };
        //取出recArray中最後一筆紀錄
        var dataArray = recArray.pop();
        //取得id及原來位置、移動張數
        var idStr = "#" + dataArray[0];
        var $origin = dataArray[1];
        var cardCount = dataArray[2];
        //若cardCount為-1表示此undo是在autoMove之後發生
        c(cardCount);
        if (cardCount == -1) {
            autoMoveFlag = true;
            cardCount = 1;
        }
        //移動並增加z-index
        changeCards($(idStr), cardCount, function ($t) {
            moveCardDiv($t, $origin);
        });
        //若此undo是在autoMove之後發生，則再次觸發undo鍵且不進行後面的移動次數更新
        if (autoMoveFlag) {
            c("trigger undo");
            $(".undo").trigger("click");
        } else {
            //更新移動次數
            moves--;
            movesRefresh();
        };
    });
	//判斷是否通關的函數
	function completeCheck(){
        var sortedCards = $(".scoreArea .card").length;
        //測試點：修改這裡的張數可以快速通關
        if (sortedCards == 52) {
            //改變start狀態
            start = false;
			//停止計時
			pauseGameTimer();
			//修改通關訊息
			$(".record").html($("#moves").text() + "<br>TIME: " + $("#time").text());
			//顯示通關訊息
            $("#completeMsg").stop().fadeIn(400);
            /*通關攤牌效果
             * 這裡要製造一個卡牌散亂的效果
             * 卡牌的left值會在0-1065px
             * top值為0-642px
             * 並隨機加入旋轉
             * 計算出移動距離後得出對應的移動時間
             */
            for (var i = 0; i < 52; i++) {
                var left = parseInt(Math.random() * 1365 -150);
                var top = parseInt(Math.random() * 617 + 300);
                var rotateDeg = parseInt(Math.random() * 360);
                var distance = Math.sqrt(Math.pow($gl($(".card").eq(i)) - left, 2) + Math.pow($gt($(".card").eq(i)) - top, 2));
                var t = distance / 1100 * 6;
                //先增長過渡動畫時間
                $(".card").css("transition", "all "+t+"s cubic-bezier(0.12, 0.63, 0.34, 0.94)");
                $(".card").eq(i).css({
                    "left": (left + "px"),
                    "top": (top + "px"),
                    "transform": ("rotate("+ rotateDeg +"deg)")
                })
            }
		}
	};
    //動態改變遊戲區域高度的函數
    function heightReset() {
        var max = 0;
        for (var i = 0; i < 8; i++) {
            //依序取出每個cardColumn中的card數量，找出其最大值
            var cardAmount = $(".cardColumn").eq(i).find(".card").length;
            max = max > cardAmount ? max : cardAmount;
        }
        //改變遊戲區域高度
        var height = 800 + (max - 7) * 44
        $("#playArea").css("height", height + "px");
        $("aside").css("height", height + "px");
    }
    //判斷是否有可以自動移至得分區的卡的函數
    function autoMove() {
        /*
         * 依序找每一列最下方的卡牌(包含左上角space區)
         * 如果是A: 只要有得分區有空位就直接移動
         * 如果是2: 只要得分區有同樣花色的A就直接移動
         * 其他: 如果比該卡牌數字小2且顏色不同的卡和跟該卡牌花色相同且數字小1的卡都已在得分區，才可以移動
         */
        //先檢查是否通關
        completeCheck();
        //先找到每一列最下面的卡
        var $cardInSpace = $(".space>.card");
        var $cardInCardColumn = $(".cardColumn>.card:last-child");
        //判斷是否可移動的函數
        function canMoveOrNot($cards) {
            for (var i = 0; i < $cards.length; i++) {
                //用moveFlag判斷最後是否可以移動，$pos紀錄移動目標位置
                var moveFlag = true;
                var $pos;
                //依序取出卡
                var $card = $cards.eq(i);
                //若卡為A
                if (toCard($card).num == 1) {
                    //找到第一個空的scoreArea並將卡牌移入
                    $pos = $(".scoreArea:empty").eq(0);
                }
                //若卡為2
                else if (toCard($card).num == 2) {
                    //找到對應花色的A
                    var $theA = eval(toCard($card).suit + "_" + 1).elem;
                    //若該A位於得分區則將此2進行移動
                    if ($theA.parent().attr("class") == "scoreArea") {
                        $pos = $theA.parent();
                    } else {
                        moveFlag = false;
                    }
                }
                //若卡為其他數字
                else {
                    var num = toCard($card).num - 2;
                    suitArray.forEach(function (item) {
                        //找到數字比目標卡牌小2的每張卡
                        var card = eval(item + "_" + num);
                        //判斷此卡是否顏色與目標卡牌不同
                        if (card.color != toCard($card).color) {
                            //判斷此卡目前位置，若不在scoreArea則更改moveFlag
                            if (card.elem.parent().attr("class") != "scoreArea") {
                                moveFlag = false;
                            }
                        }
                    });
                    //找到比和目標卡牌花色相同且數字小1的卡
                    var $baseCard = $("#"+ toCard($card).suit + "_" + (toCard($card).num - 1));
                    //判斷此卡目前位置，若不在scoreArea則更改moveFlag
                    if ($baseCard.parent().attr("class") != "scoreArea") {
                        moveFlag = false;
                    } else {
                        //若在scoreArea則紀錄其目前位置作為移動目標位置
                        $pos = $baseCard.parent();
                    };
                }
                //判斷是否進行移動
                if (moveFlag) {
                    c("moveing!!")
                    //記錄原先位置，cardCount傳入-1表示此移動為autoMove
                    record($card, -1);
                    moveCardDiv($card, $pos);
                    //結束此次搜尋並再搜尋一次(暫停0.2秒以免一次吸一堆牌看不清楚)
                    return setTimeout(autoMove, 200)
                }
            }
        }
        canMoveOrNot($cardInSpace);
        canMoveOrNot($cardInCardColumn);
    }
    //滑鼠置於scoreArea的卡片上可以讓同花色的卡牌變色
    $(".scoreArea").delegate(".card:last-child", "mouseenter", function (event) {
        var $card = $(".card");
        for (var i = 0; i < $card.length; i++) {
            var card = toCard($card.eq(i));
            if (card.suit == toCard($(event.target)).suit) {
                card.elem.css("filter", "invert(100%)");
            }
        }
    })
    $(".scoreArea").delegate(".card:last-child", "mouseleave", function () {
        $(".card").css("filter", "");
    })
    //滑鼠置於cardColumn及space的卡片上可以讓不同顏色且數字+1的卡牌變色
    function hoverHint($target) {
        $target.delegate(".card", "mouseenter", function (event) {
            var $card = $(".card");
            for (var i = 0; i < $card.length; i++) {
                var card = toCard($card.eq(i));
                if (card.color != toCard($(event.target)).color && card.num - 1 == toCard($(event.target)).num) {
                    card.elem.css("filter", "invert(100%)");
                }
            }
        });
        $target.delegate(".card", "mouseleave", function () {
            $(".card").css("filter", "");
        });
    };
    hoverHint($(".cardColumn"));
    hoverHint($(".space"));
    //點擊「查看遊戲說明」
    $("#showInstruction").click(function () {
        $("#instruction").css("display", "block");
        $(window).scrollTop($(window).scrollTop()+800) ;
    });

    ////測試用按鈕
    //$("#btn1").click(function () {
    //    autoMove();
    //});
    //$("#btn2").click(function () {
    //    startGameTimer();
    //});

};