/**
 * Created by hesk on 2016/10/4.
 */
const target_domain = "http://app.legco.gov.hk/BillsDB/odata/Vbills";
var http = require("http");
var fs = require("fs");
var fse = require("fs-extra");
const path = require("path");
const async = require("async");
var request = require("request");
var _ = require("lodash");
var es2 = require("./el2");
var crackTool = require("./crackTool").crackTool;
var _V6_ = require("./pdf_cpdf_name_base_v6");
var list_pdf = require("./../data/total_data_final.json");
var scan_item = 0;
var at_year_level = function (yearName) {
  for (var i = 0; i < list_pdf.length; i++) {
    if (list_pdf[i].year == yearName) {
      console.log("> found the match =======================", yearName);
      make_scan(list_pdf[i]);
      break;
    } else {
      console.log("> not match =======================", yearName);
    }
  }
};
var year_level = function (start_int) {
  scan_item = start_int;
  if (scan_item > list_pdf.length - 1) {
    console.log("> =======================");
    console.log("no scan", scan_item);
    console.log("> =======================");
    return;
  }
  console.log("> =======================");
  console.log("make scan 101");
  console.log("> =======================");
  make_scan(list_pdf[scan_item]);
  console.log("> =======================");
  console.log("make scan 102");
  console.log("> =======================");
};
var make_scan = function (year_item) {
  const list = year_item.index;
  const _year_ = year_item.year;
  const dest = path.dirname(module.main) + "/tmp/";
  var elastic = new es2.instance({
    year: _year_
  });
  if (!elastic.isReady()) {
    console.error("elastic search engine is not setup properly.");
    console.log("> === operation aborted.");
    return;
  }
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
      elastic.initIndex().then(elastic.initMapping()).then(function (success) {
        console.log("> === configuring mappings", success);
        callback(null, true);
      }, function (err) {
        console.log("> === ended has err", err);
      });
    }
  ], function (err, results) {
    var n = 0, array = [], filesindex = [];
    _.forEach(list, function (data) {
      const _scope_ = {
        url: data.src,
        out: dest + "g0vhk_d" + n + ".pdf",
        el: elastic,
        data_bill_title: getDate(data.time),
        process_file_order: n
      };
      n++;
      array.push(_scope_);
    });
    console.log("> === prepared to process files stored with number of [" + n + "]");
    exeArrayFunc(array);
  });
};
function getDate(line) {
  var b1 = line.match(crackTool.date_cn_extraction_v1);
  console.log(b1);
  return b1[0] || "";
}
function exeArrayFunc(array_fun) {
  async.eachSeries(array_fun, function (activity, callback) {
    // console.log(activity.data_bill_title, activity.url);
    console.log("> ======================= <");
    console.log("activity scope", activity);
    console.log("> ======================= <");
    fse.ensureFile(activity.out, function (err) {

      const stream_data = request(activity.url).pipe(fs.createWriteStream(activity.out, {flags: "w"}));
      stream_data.on("finish", function () {
        if (err) {
          console.log("> xpdf file creation", "===================");
          console.log(err);
          console.log("> xpdf end", "===================");
        }

        _V6_.newInstance();
        _V6_.initNewConfig(activity);
        _V6_.on("complete", function (msg) {
          console.log("> =============================================== <");
          console.log("> callback is call here upon _V6_ is complete", msg);
          console.log("> =============================================== <");
          return callback(null, "done");
        });
        _V6_.on("scanpage", function (doc) {
          activity.el.addDoc(doc).then(function (body) {
            doc = null;
          }, function (err) {
            console.log("> xpdf error", err);
          });
        });
        _V6_.start();
        //_V6_.startDemo();
      });

      stream_data.on("error", function (err) {
        console.log("> http request error", err);
        console.log("> skip file order: ", activity.process_file_order);
        return callback(err, null);
      });

    });
  }, function done() {
    console.log("==============================================================");
    console.log("=== scan completed: " + array_fun.length + " for files ========");
    console.log("==============================================================");
    scan_item++;
    if (scan_item < list_pdf.length) {
      var item2scan = list_pdf[scan_item];
      make_scan(item2scan);
    }
  });
}
module.exports.latestyear = year_level;
module.exports.fisicalyear = at_year_level;
