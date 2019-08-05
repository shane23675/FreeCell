window.onload = function () {
    var c = console.log;
    //定義一個 Card類
    function Card(suit, num) {
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
        for (var i = 0; i < 52; i++) {
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
        };
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
			//檢查是否符合移動規則，不符合則強制退出
			if (!takeCardCheck($t)){
				alert("無法移動這張卡牌");
				return
			};
            //移動開始，將target的z-index調到最大，才不會被其他卡牌遮住
            $t.css("z-index", "100");
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
                $t.css("left", left + "px").css("top", top + "px");
            });
            //在window中放開滑鼠
            $(window).on("mouseup", function () {
                //完成移動，先將target的z-index恢復原狀
                $t.css("z-index", "");
                /* 調整目標的X座標：
                 * 以標準狀況來說的分界線是在60+110+(25/2), +110+25, +...
                 * 是用left+55 去對(目標卡牌的中心點X座標)
                 * 也就是若left+55 < 60+110+(25/2)為第一排, left+25 < 60+110+(25/2) + (110+25)*1 為第二排
                 * 全部用對應的變數去換則是：
                 * left+parseInt($col.css("width"))/2 < parseInt($cf.css("padding-left")) + parseInt($col.css("width")) + parseInt($col.css("margin-right"))/2
                 * 間隔為parseInt($col.css("width")) + parseInt($col.css("margin-right"))
                 * 移項過後變成：
                 * left < parseInt($cf.css("padding-left")) + (parseInt($col.css("width")) + parseInt($col.css("margin-right")))/2
                 * 間隔為parseInt($col.css("width")) + parseInt($col.css("margin-right"))
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
                        $t.css("left", left + "px");
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
                //將$t的top值清空才能吃到space的預設值
                $t.css("top", "");
                //此時若count == 0 表示目標位置為第一欄， count == 1 表示目標位置為第二欄...
                if (top + $gh($t) / 2 <= $gh("#gameInfo") + $gh("#cardSpace")) {
                    //移動至cardSpace中的某欄
                    var newPlace = $("#cardSpace>div:nth-child(" + (count + 1) + ")");
                } else {
                    //移動至cardColumn中的某欄
                    var newPlace = $cf.find("div.cardColumn:nth-child(" + (count + 1) + ")");
                }
                //調用card移動函數
                moveCardDiv($t, newPlace);
                //移除main的mousemove事件
                $p.off("mousemove");
                //移除window的mouseup事件
                $(window).off("mouseup");
            });
        })
    }
    //將card在DOM樹中移動的函數
    function moveCardDiv($t, newPlace) {
        //新製造一個複製品
        var $tClone = $t.clone(false);
		//此對應卡牌的elem屬性指向這個複製品
		var card$t = eval($t.attr("id"));
        card$t.elem = $tClone;
		//將原目標刪除
        $t.remove();
		//將複製品移至目標位置
        $(newPlace).append($tClone);
        //重新幫$tClone綁定dragElement
        dragElement($tClone);
    };
	//拿取目標元素時檢測規則的函數
	function takeCardCheck($t){
		//目標後面沒有任何card，可以移動
		if ($t.next().length == 0){
			return true
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
				return takeCardCheck($t.next())
			}else{
				return false
			};
		};
	};
	$("button").click(function(){
		c(takeCardCheck(club_13.elem));
	});
    //放置目標元素時檢測規則的函數
    function placeCardCheck() {

    };
	

};