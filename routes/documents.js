const express = require('express');
const router = express.Router();
const elastic = require('../common/elasticsearch');
const pawn = require('../common/pawn');
const xpdf = require('../common/testxpdf');
/** GET suggestions */
router.get('/suggest/:input', function (req, res, next) {
    elastic.getSuggestions(req.params.input).then(function (result) {
        res.json(result)
    });
});
/** POST document to be indexed */
router.post('/', function (req, res, next) {
    elastic.addDocument(req.body).then(function (result) {
        res.json(result);
    });
});
/**   */
router.get('/crawl/:year', function (req, res, next) {
    pawn.searchByYear(req, res);
});
router.get('/test/', function (req, res, next) {
    xpdf.pdf_demo_text({
            remove_space_asian_character: true,
            new_paragraph: true,
            from: 0,
            to: 20
        },
        res);
});
router.get('/test_v1/', function (req, res, next) {
    xpdf.pdf_demo_text({
        remove_space_asian_character: false,
        new_paragraph: false,
        from: 0,
        to: 15
    }, res);
});
router.get('/test_v2/', function (req, res, next) {
    xpdf.pdf_demo_text({
        remove_space_asian_character: true,
        new_paragraph: false,
        from: 0,
        to: 15,
        customwork: function (line) {
            /**
             * look ahead selection
             * \d{3,4}(?=[\u7acb\u6cd5\u6703\u2500]+(19\d\d|200\d|201\d)[\u5e74](1\d|\d)[\u6708](1\d|2\d|3\d|\d)[\u65e5])
             *
             * select the number
             *
             *
             * (\d\d\d\d)[\u7acb]
             * catch the pages first and second
             */
            /*line = line.replace(/([\u65e5])(\d\d\d\d)/g, function (ex) {
             return "$1(page no.$2)";
             });
             line = line.replace(/(\d\d\d\d)([\u7acb])/g, function (ex) {
             return "(page no.$1)$2";
             });*/
            /**
             * http://www.elasticsearchtutorial.com/elasticsearch-in-5-minutes.html
             *
             *
             * catch all
             * 立法會─2013年2月6日
             */
            line = line.replace(/[\u7acb\u6cd5\u6703\u2500]+(19\d\d|200\d|201\d)[\u5e74](1\d|\d)[\u6708](1\d|2\d|3\d|\d)[\u65e5]/g, '');
            return line;
        }
    }, res);
});

var content_check = "(iii)由標準檢定機構或類似機構就該消費品所屬的消費品類別，或就與該類別的消費品有關事宜所公布的合理安全標準；及(iv) 當考慮到作出改善的成本、可能性及程度，是否有合理的方法使該消費品更為安全。海關負責《條例》的執法工作。一直以來，海關除跟進調查市民的投訴外，亦主動巡查本地各供應商號，若發現供應本港的產品懷疑不安全時，會採取適當的行動，包括試購產品進行安全測試。如產品未能符合法例指明的安全規定，海關會警告或檢控供應商。(二) 一向致力確保香港市面供應的產品 (尤其是嬰兒及兒童產品)的安全。在過去3年(2009年至2011年)，海關就市面上出售的嬰兒產品，進行了2 235次巡查，以及抽取了40件不同類型嬰兒尿片／褲樣本進行安全測試。同期，海關接獲7宗就嬰兒尿片／褲懷疑不安全的投訴，並就每宗個案抽取樣本進行測試。測試結果顯示，所有樣本均符合相關標準規定的安全要求，包括細菌菌落總數及真菌菌落總數上限等衞生方面的規定。海關會繼續按風險評估的原則，進行巡查及測試等工作。國際學校學額2. 劉健儀議員：主席，當局曾經表示，政府一向支持國際學校體系的蓬勃發展，以滿足在香港居住和因工作或投資而來港的海外家庭對國際學校學額的需求。據悉，多個外國商會最近紛紛提出警告，指本港的國際學校學額嚴重短缺，更指有關情況已達致危機程度，威脅本港世界級城市的地位。就此，政府可否告知本會：(一) 是否知悉，過去5年，本港各間國際學校的輪候人數及最長的輪候時間分別為何；輪候者當中本地與非本地學生的比率為何；(二) 當局有否收到有關商會對國際學校學額嚴重不足的投訴；若有，有否評估該等學額的短缺情況是否已達危機程度；若評估的結果為是，有何政策紓解；若評估的結果為否，會否跟進相關的投訴；及立法會 ─ 2012年2月1日 3477(三) 鑒於有報道指出，當局擬採取新政策，要求獲新分配空置校舍或土地供發展之用的國際學校，把取錄的本地學生的最高百分比由50%減至30%，以便在未來數年新增的國際學校學額可應付非本地學生對該等學額越來越大的需求，該政策的具體內容為何，以及對紓緩非本地學生的需求有何影響；會否推廣這項政策至現有的國際學校？教育局局長 ：主席，特區府一直透過不同措施支援國際學校的發展，包括分配空置校舍和全新土地作國際學校的發展，以及協助現有國際學校在原址擴建，以滿足在香港居住和因工作或投資而來港的海外家庭對國際學校學額的需求。我現就劉健儀議員所提出質詢的3個內地傳媒昨日報道，四川宜賓市筠連縣一名47歲男子張興林，其20歲女兒張晶晶(化名)今年6月24日在浙江海寧許村慶祝生日，沒想到變成死忌。同在海寧打工的馬姓初中校友，凌晨時分開車送她回家。豈料，馬男企圖性侵女方，晶晶在跳車逃離魔爪時不慎頭部着地受傷。馬男非但沒有將晶晶送院急救，竟趁機抱她上車強姦，最終晶晶傷重不治。警方昨日通報，馬男已被抓獲，案件有待進一步調查。「我9點45分給她打了個電話，讓她早點回家，結果再接到電話就說人不在了……」張父語帶哽咽地對訴說，他想女兒了。事發後翌日，張父趕到海寧只見到晶晶的屍體已停放在殯儀館。據他了解，當時女兒和10多名朋友在KTV唱歌慶祝，沒想到馬男性侵受了傷的女兒，還將車開到別處，3個小時後才報警說出了車禍。此時，晶晶已經死亡。「聽說當時車子後座上全是我女兒的血，警察覺得不對勁，事後調查發現他涉嫌強姦了我女兒。」張父說，他打聽得知，馬男曾是張晶晶的初中校友，之前好像追求過她，但沒有成功。網上曝光的晶晶的屍檢報告，海寧市公安司法鑒定中心分析認定，其頭部遭外力衝擊致顱骨骨折、腦挫裂傷、顱內出血死亡。對於晶晶，張父感到十分愧疚，說起女兒，就是一個字：「乖」。晶晶是張父與第二任妻子生的女兒，她還有一個大她10歲同父異母的哥哥張濤（化名）。就在張晶晶1歲多時，她的母親離家出走從此再也未歸。對於這段婚姻，張父不願多提，「現在這個社會就是這樣的」。此後多年，張父一直在雲南昭通打散工。據他說，因為身體不好文化程度有限，只能從事一些勞動工作，掙不了甚麼錢，除了時不時的一個電話，每年也就過年的時候回家看看孩子。晶晶和張濤一直是由嫲嫲撫養。因為老人家身體不太好，初中畢業後，晶晶沒有繼續讀書，選擇留在家裡照顧嫲嫲，直到5年後，老人家病逝。此時的張晶晶才19歲，和家人商量後到浙江海寧打工。「他哥哥和很多老鄉都在海寧打工，四川人多些好點。」張父沒想到，正是四川老鄉讓女兒失去性命。對於妹妹的離世，張濤則不願多談，「我當時不在現場。從出事到現在，馬家人都沒露過面。現在等公安機關的調查結果吧。」四川封面新聞";
var es2 = require("./../common/el2");
const path = require('path');
const async = require('async');
router.get('/localmock/', function (req, res, next) {
    const dest = path.dirname(module.main) + "/tmp/";
    var bd = dest + "hansard_0_.pdf";
    const result = {
        content: content_check,
        title: "Minutes " + 1 + " p: " + 10 + " - " + 200,
        metadata: []
    };
    console.log("now processed pages from", result);
    result.data_internal_key = 313123;
    result.data_read_order = 11;
    result.data_source_url = "http://ufsihiusdvhuihdvs.com/isoiefseofns/vsvsd/vsesef/fs.pdf";
    var elastic = new es2.instance({
        year: 2012
    });
    if (elastic.isReady()) {
        
        async.series([
            function (callback) {
                var exists = elastic.indexExists();
                if (exists) {
                    elastic.deleteIndex().then(function (body) {
                        console.log("> === remove previous index");
                        callback(null, true);
                    }, function (error) {
                        console.log("> === remove index error", error);
                    });
                }
            },
            function (callback) {
                console.log("> === start indexing ");
                elastic.initIndex().then(elastic.initMapping(), function (reject) {
                    console.log("> === failure to index");
                }).then(function () {
                    console.log("> === elasticsearch mapping");
                    callback(null, true);
                });
            }
        ], function (err, serialresults) {
            console.log("xpdf: ", result);
            elastic.addDoc(result).then(function (body) {
                console.log("xpdf process web body return: ", body);
                res.json(body);
            }, function (err) {
                console.log("xpdf process unsuccessful: ", err);
                res.json(err);
            });
        });
    } else {
        console.log("not ready");
    }
});
module.exports = router;