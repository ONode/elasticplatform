const express = require('express');
const router = express.Router();
const elastic = require('../common/el2');
const docScan = require('../common/documentlevel');
const docScanFiles = require('../common/fileslevel');
const webcrawler = require('../common/webcrawler');
const testcase = require('../common/testxpdf');
/** GET suggestions */
router.get('/suggest/:input', function (req, res, next) {
  /*elastic.getSuggestions(req.params.input).then(function (result) {
   res.json(result)
   });*/
});
/** POST document to be indexed */
router.post('/crawl/v1/:year', function (req, res, next) {
  /*  elastic.addDocument(req.body).then(function (result) {
   res.json(result);
   });*/

  docScan.searchByYear(req, res);
});

router.get('/crawl/v4/test_year_2016', function (req, res, next) {
  docScanFiles.DevScanMock("2015-2016");
  return res.send({ackownledge: true});
});
router.get('/crawl/v3/:yearfiscal', function (req, res, next) {
  docScanFiles.ProductionScanOneYear(req.params.yearfiscal);
  return res.send({ackownledge: true});
});
router.get('/crawl/v2/:start_from/', function (req, res, next) {
  docScanFiles.ProductionScanYearSpan(parseInt(req.params.start_from));
  return res.send({ackownledge: true});
});
router.get('/test_webcrawler/', function (req, res, next) {
  webcrawler.makescan();
});
router.get('/test_v1/', function (req, res, next) {
  testcase.testcasexpdf({
    remove_space_asian_character: false,
    new_paragraph: false,
    from: 0,
    to: 15
  }, res);
});
router.get('/test_v3/', function (req, res, next) {
  var instanceelb = new elastic.instance({
    year: 2011
  });

  var _scope_ = {
    url: "http://www.legco.gov.hk/yr09-10/chinese/counmtg/hansard/cm0224-translate-c.pdf",
    out: "h54otestd.pdf",
    fieldname: "h54otestd",
    isEnglish: false,
    el: instanceelb,
    data_read_order: 2,
    data_internal_key: 839232,
    data_bill_title: "2010年撥款條例草案",
    process_file_order: 1
  };

  docScan.test_single_activity(_scope_);
});
router.get('/test_v2/', function (req, res, next) {
  testcase.testcasexpdf({
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

var content_check = "(iii)由標準檢定機構或類似機構就該消費品所屬的消費品類別，或就與該類別的消費品有關事宜所公布的合理安全標準；及(iv) 當考慮到作出改善的成本、可能性及程度，是否有合理的方45分給她打了個電話，讓她早點回家，結果再接到電話就說人不在了……」張父語帶哽咽地對訴說，他想女兒了。事發後翌日，張父趕到海寧只見到晶晶的屍體已停放在殯儀館。據他了解，當時女兒和10多名朋友在KTV唱歌慶祝，沒想到馬男性侵受了傷的女兒，還將車開到別處，3個小時後才報警說出了車禍。此時，晶在海寧打工，四川人多些好點。」張父沒想到，正是四川老鄉讓女兒失去性命。對於妹妹的離世，張濤則不願多談，「我當時不在現場。從出事到現在，馬家人都沒露過面。現在等公安機關的調查結果吧。」四川封面新聞";
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

/**
 開放資料網頁應用程式介面可在以下網址執行：
 http://app.legco.gov.hk/BillsDB/odata/Vbills （JSON 格式）
 http://app.legco.gov.hk/BillsDB/odata/Vbills?$format=xml （XML 格式）
 如要取得數據集的資料架構，請執行以下命令：
 http://app.legco.gov.hk/BillsDB/odata/$metadata
 可使用以下查詢選項：
 $format - 指明以 JSON 或 XML 格式傳回資料，例如 $format=json
 $top=N - 只選擇數據集首 N 項資料，N 為一個正整數,，例如 $top=10
 $skip=N - 只選擇餘下的資料（即由第 N+1 項開始），N 為一個正整數，例如 $skip=10
 $orderby - 以哪項資料排序，例如 $orderby=bill_title_eng
 $select - 選擇要傳回哪幾項資料，例如 $select=bill_title_eng,bill_title_chi,bill_gazette_date
 $filter - 按照所提供的條件搜尋特定資料，例如 $filter=year(bill_gazette_date) eq 2013
 $inlinecount - 指明“$inlinecount=allpages”，使傳回的資料包括紀錄總數
 如欲了解更多選項所用的運算符和函數，請參閱 開放資料通訊協定的文件。

 例子
 以下例子說明根據開放資料通訊協定檢索資料的一些方法。

 選擇第 501 至第 520 項紀錄（預設為 JSON 格式）：
 http://app.legco.gov.hk/BillsDB/odata/Vbills?$skip=500&$top=20
 選擇最前的 20 項紀錄中的英文法案標題及中文法案標題，按英文法案標題排序，並以 XML 格式回傳：
 http://app.legco.gov.hk/BillsDB/odata/Vbills?$top=20&$format=xml&$select=bill_title_eng,bill_title_chi&$orderby=bill_title_eng
 選擇所有中文法案標題包含“選舉”的紀錄，及符合此條件的紀錄總數，並以 XML 格式回傳：
 http://app.legco.gov.hk/BillsDB/odata/Vbills?$format=xml&$inlinecount=allpages&$filter=substringof('選舉',bill_title_chi) eq true
 選擇所有法案刊登憲報日期在 2013 年的紀錄，及符合此條件的紀錄總數，並以 JSON 格式回傳：
 http://app.legco.gov.hk/BillsDB/odata/Vbills?$format=json&$inlinecount=allpages&$filter=year(bill_gazette_date) eq 2013

 **/


/**

 var Chinese = require('chinese-s2t')
 Chinese.s2t('简体转繁体');
 Chinese.t2s('繁体转简体');

 */