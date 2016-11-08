const express = require('express');
const router = express.Router();
const elastic = require('../common/el2');
const docScan = require('../common/documentlevel');
const docScanFiles = require('../common/fileslevel');
const webcrawler = require('../common/webcrawler');
const testcase = require('../common/testxpdf');
const result_bool = {
  "acknowledge": true
};
/** GET suggestions */
router.get('/suggest/:input', function (req, res, next) {
  /*elastic.getSuggestions(req.params.input).then(function (result) {
   res.json(result)
   });*/
});
/** POST document to be indexed */
router.post('/crawl/v1/:year', function (req, res, next) {
  docScan.searchByYear(req, res);
});

router.get('/crawl/v4/test_year_2016', function (req, res, next) {
  docScanFiles.DevScanMock("2015-2016");
  return res.send(result_bool);
});
router.get('/crawl/v3/:yearfiscal', function (req, res, next) {
  docScanFiles.ProductionScanOneYear(req.params.yearfiscal);
  return res.send(result_bool);
});
router.get('/crawl/v2/:start_from/', function (req, res, next) {
  docScanFiles.ProductionScanYearSpan(parseInt(req.params.start_from));
  return res.send(result_bool);
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
router.get('/test_v4/', function (req, res, next) {
  const dest = path.dirname(module.main) + "/data/legcopdflist";
  docScanFiles.ListFiles(dest);
  res.json(result_bool);
});
module.exports = router;
