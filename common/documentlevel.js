const target_domain = "http://app.legco.gov.hk/BillsDB/odata/Vbills";
var http = require('http');
var fs = require('fs');
var fse = require('fs-extra');
const path = require('path');
const async = require('async');
var request = require("request");
var _ = require("lodash");
var es2 = require("./el2");
var Promise = require("promise");
const logTag = "> crawler";
var V5 = require("./pdf_index_pages_v5");
var _V6_ = require("./pdf_cpdf_name_base_v6");
const fields_eng_only = [
  'first_reading_date_hansard_url_eng',
  'first_reading_date_2_hansard_url_eng',
  'second_reading_date_hansard_url_eng',
  'second_reading_date_2_hansard_url_eng',
  'second_reading_date_3_hansard_url_eng',
  'second_reading_date_4_hansard_url_eng',
  'second_reading_date_5_hansard_url_eng',
  'third_reading_date_hansard_url_eng'
];
const fields_chi_only = [
  'first_reading_date_hansard_url_chi',
  'first_reading_date_2_hansard_url_chi',
  'second_reading_date_hansard_url_chi',
  'second_reading_date_2_hansard_url_chi',
  'second_reading_date_3_hansard_url_chi',
  'second_reading_date_4_hansard_url_chi',
  'second_reading_date_5_hansard_url_chi',
  'third_reading_date_hansard_url_chi'
];
const fields_chi_meta = [
  'bill_title_chi'
];
const fields_eng_meta = [
  'bill_title_eng'
];
var demo_files_lock = parseInt(process.env.SEARCHFARM_SCAN_FILES_LIMIT) || 100;
const step_2 = function (year_code, json, res) {
  var count = json['odata.count'];
  console.log("=== files found ===");
  console.log(count);
  console.log("=============");

  const dest = path.dirname(module.main) + "/tmp/";
  res.json({
    pathstart: dest,
    processpdfs: count,
    message: "started making queues"
  });
  var elastic = new es2.instance({
    year: year_code
  });
  if (!elastic.isReady()) {
    console.error("elastic search engine is not setup properly.");
    console.log("> === operation aborted.");
    return;
  } else {
    console.log("> === ES is prepared.");
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
      _.forEach(json.value, function (val) {
        var key_internal = parseInt(val.internal_key);
        var chinese_bill_title = val.bill_title_chi;
        _.forEach(fields_chi_only, function (h) {
          var base_file_val = val[h];
          var regex = /_+\d+_/;
          var is_eng = h.indexOf("_eng") !== -1, read_order = 1;
          if (regex.test(h)) {
            read_order = parseInt(h.replace(/[^0-9\.]/g, ''), 10);
          }
          if (!_.isEmpty(base_file_val) && n < demo_files_lock) {
            if (base_file_val.indexOf("#") > -1) {
              base_file_val = base_file_val.split("#")[0];
            }
            var isUnique = filesindex.indexOf(base_file_val) == -1;
            if (isUnique) {
              filesindex.push(base_file_val);
              const _scope_ = {
                url: base_file_val,
                out: dest + "h" + key_internal + "o" + n + "d.pdf",
                fieldname: h,
                isEnglish: is_eng,
                el: elastic,
                data_read_order: read_order,
                data_internal_key: key_internal,
                data_bill_title: chinese_bill_title,
                process_file_order: n
              };
              array.push(_scope_);
              n++;
            }
          }
        });
      });
      console.log("> === prepared to process files stored with number of [" + n + "]");
      //Promise.all(array);
      exeArrayFunc(array);
    });
  }
};

function exeArrayFunc(array_fun) {
  async.eachSeries(array_fun, function (activity, callback) {
    // console.log(activity.data_bill_title, activity.url);
    console.log("> ======================= <");
    console.log("activity scope", activity);
    console.log("> ======================= <");
    fse.ensureFile(activity.out, function (err) {

      const stream_data = request(activity.url).pipe(fs.createWriteStream(activity.out, {flags: 'w'}));
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
    console.log("=====================================");
    console.log("=== scan completed: " + array_fun.length + " for files ========");
    console.log("=====================================");
  });
}
var test_activity = function (activity) {
  var array = [];
  array.push(activity);
  exeArrayFunc(array);
};
var searchByYear = function (req, res) {
  const head = "?$format=json&$inlinecount=allpages&$filter=year(bill_gazette_date) eq ";
  if (!isNaN(req.params.year)) {
    var allqueries = head + req.params.year;
    console.log("start request from the year of: ", req.params.year);
    request({
      url: target_domain + allqueries,
      json: true
    }, function (error, response, body) {
      if (error) {
        res.render('error', error);
        return;
      }
      if (response.statusCode === 200) {
        step_2(req.params.year, body, res);
      } else {
        res.render('index', {title: 'The gov center maybe down.'});
        return;
      }
    });
  } else {
    res.render('index', {title: 'Legco Center no year request is found'});
  }
};
var searchGoogle = function (req, res) {

};
module.exports.test_single_activity = test_activity;
module.exports.searchByYear = searchByYear;