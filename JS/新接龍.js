window.onload = function () {
    var c = console.log;
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
    //用cardArray來裝填所有的Card物件
    var cardArray = [];
    suitArray.forEach(function (item) {
        for (var i = 1; i <= 13; i++) {
            var str = ("window." + item + "_" + i + "= new Card('" + item + "'," + i + ");");
            eval(str);
            var str2 = "cardArray.push(" + item + "_" + i + ")";
            eval(str2);
        }
    });
    //開局時隨機發牌的函數
    (function () {
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
            //回調自身(i==51時，已經走了52次，此時停止遞迴呼叫)
            if (i < 51) {
                setTimeout(function () { initialization(i + 1); }, interval);
            } else {
                //發牌完成，遊戲開始計時
                timeStart();
            };
        };
        setTimeout(function () { initialization(i); }, interval);
    })();
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
			//檢查是否符合移動規則，不符合則強制退出，並用cardCount記錄移動張數
			var cardCount = takeCardCheck($t);
            if (cardCount == "overtake") {
                alert("目前最多只能同時移動" + maxTakeCheck() + "張卡牌");
                return
            } else if (cardCount == "foul") {
                alert("無法移動這張卡牌");
                return
            }
            //移動開始，將目標及其下方卡牌的z-index調到最大，才不會被其他卡牌遮住
            changeCards($t, cardCount, function(card, i){
				card.css("z-index", 100);
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
                //完成移動，先將目標及其下方卡牌的z-index恢復原狀
                changeCards($t, cardCount, function(card, i){
					card.css("z-index", "");
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
                //檢查此放置行動是否符合規則
                if (!placeCardCheck($t, $newPlace, cardCount)) {
                    //不符合規則，將所有卡牌的top及left值清除使其回到原來位置
                    changeCards($t, cardCount, function (card, i) {
                        card.css("top", "").css("left", "");
                    });
                } else {
                    //符合規則，調用card移動函數將目標及其下方卡牌移至新位置
                    changeCards($t, cardCount, function (card, i) {
                        moveCardDiv(card, $newPlace);
                    });
                };
                //移除main的mousemove事件
                $p.off("mousemove");
                //移除window的mouseup事件
                $(window).off("mouseup");
            });
        })
    }
    //將card在DOM樹中移動的函數
    //用moves來記錄移動次數
    var moves = 0;
    function moveCardDiv($t, $newPlace) {
        //新製造一個複製品
        var $tClone = $t.clone(false);
		//此對應卡牌的elem屬性指向這個複製品
		var card$t = eval($t.attr("id"));
        card$t.elem = $tClone;
		//將原目標刪除
        $t.remove();
		//將複製品移至目標位置
        $newPlace.append($tClone);
        //重新幫$tClone綁定dragElement
        dragElement($tClone);
        //增加移動次數記錄
        moves++;
        $("#moves").text(moves + " Moves");
        //若moves == 1，則啟用undo功能
        if (moves == 1) {
            $(".undo").css("opacity", 1);
        } else if (moves == 0) {
            $(".undo").css("opacity", "");
        }
        
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
			//取得目標的id字串
			var id = $t.attr("id");
			//取得該id對應的card物件
			var card$t = eval(id);
			//取得下一張卡牌的card物件
			var card$tNext = eval($t.next().attr("id"));
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
        var cardLast = eval($newPlace.find("div.card:last-child").attr("id"));
        //獲取$t的card對象
        var card$t = eval($t.attr("id"));

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
    //開始計算時間的函數
    function timeStart() {
        var sec = 0;
        var min = 0;
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
        //給window添加一個停止計時器的方法
        window.stopGameTimer = function () {
            clearInterval(gameTimer);
        };
    };



    //測試用按鈕
    $("button").click(function () {
        c(maxTakeCheck());
    });

};