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
        //創建一個對應的DOM元素
        $("#playArea").append('<div class="card" id="' + this.id + '" style="background-image: url(images/52cards/' + this.id + '.png)"></div>');
        //此物件的elem屬性指向該DOM元素
        this.elem = $("#" + this.id);
        //將dragElement函數套用於該DOM元素上
        dragElement(this.elem);
    };
    //創建club1 ~ spade13 代表各張撲克牌
    var suitArray = ["club", "diamond", "heart", "spade"];
    suitArray.forEach(function (item) {
        for (var i = 1; i <= 13; i++) {
            var str = ("window." + item + "_" + i + "= new Card('" + item + "'," + i + ");");
            eval(str);
        }
    });
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
        mb: "margin-bottom"
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
            //移動開始，將target的z-index調到最大
            $t.css("z-index", "100");
            //取得當前滑鼠offset值(在移動中必須固定)
            var mouseOffset = [event.offsetX, event.offsetY];
            //先定義left及top，在放開滑鼠時的事件會用到
            var left, top;
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
                //移動中為了避免top值被cardColumn的屬性給限制，因此加上!important
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
                if (top + $gh($t) / 2 <= $gh("#gameInfo") + $gh("#cardSpace")) {
                    //top變成gameInfo的高度即可置於cardSpace中
                    top = $gh("#gameInfo");
                    //將target元素刪除，新製造一個複製品放到playArea(等於從cardFolder中移至playArea)
                    var $tClone = $t.clone(false);
                    $t.remove();
                    $p.append($tClone);
                    //重新幫$tClone綁定dragElement
                    dragElement($tClone);
                    //將該複製品的高度進行調整
                    $tClone.css("top", top + "px");
                } else {
                    //若卡牌的中心點Y座標低於gameInfo + cardSpace的高度，表示應該移到cardColumn中，需先將top值刪除，才能吃到css表中的預設值
                    $t.css("top", "");
                    //將target元素刪除，新製造一個複製品放到目標cardColumn(等於從playArea中移至目標cardColumn)
                    var $tClone = $t.clone(false);
                    $t.remove();
                    //此時若count == 0 表示目標位置為第一欄， count == 1 表示目標位置為第二欄...
                    $cf.find("div.cardColumn:nth-child(" + (count + 1) + ")").append($tClone);
                    //重新幫$tClone綁定dragElement
                    dragElement($tClone);
                }

                //移除main的mousemove事件
                $p.off("mousemove");
                //移除window的mouseup事件
                $(window).off("mouseup");
            });
        })
    }
    //放置目標元素時檢測規則的函數
    function placeCard() {

    }





};