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
var _V7_ = require("./pdf_cpp_v7");
var _V8_ = require("./pdf_cpp_v8");
var list_pdf = require("./../data/total_data_final.json");
var scan_item = 0;
var onlyTestForOneYearDev = function (yearName) {
  for (var i = 0; i < list_pdf.length; i++) {
    if (list_pdf[i].year == yearName) {
      console.log("> found the match =======================", yearName);
      mock_scan(list_pdf[i], null);
      break;
    } else {
      console.log("> not match =======================", yearName);
    }
  }
};
var onlyOneFiscalYear = function (yearName) {
  for (var i = 0; i < list_pdf.length; i++) {
    if (list_pdf[i].year == yearName) {
      console.log("> found the match =======================", yearName);
      init_map_v6(list_pdf[i], null);
      break;
    } else {
      console.log("> not match =======================", yearName);
    }
  }
};
var contYearsScan = function (start_int) {
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
  init_map_v6(list_pdf[scan_item], function () {
    scan_item++;
    if (scan_item < list_pdf.length) {
      var item2scan = list_pdf[scan_item];
      init_map_v6(item2scan);
    }
  });
  console.log("> =======================");
  console.log("make scan 102");
  console.log("> =======================");
};
var mock_scan = function (year_item, next_step) {
  var n = 0, array = [],
    list = year_item.index,
    _year_ = year_item.year,
    dest = path.dirname(module.main) + "/tmp/";

  _.forEach(list, function (data) {
    const _scope_ = {
      url: data.src,
      out: dest + "g0vhk_d" + n + ".pdf",
      data_bill_title: getDate(data.time),
      process_file_order: n
    };
    n++;
    array.push(_scope_);
  });
  console.log("> === prepared to process files stored with number of [" + n + "]");
  exeArrayFuncV6(array, _year_, next_step);
};
/**
 *
 * @param year_item the name of the index
 * @param next_step the next step
 */
var init_map_v6 = function (year_item, next_step) {
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
    var n = 0, array = [];
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
    exeArrayFuncV6(array, _year_, next_step);
  });
};
function getDate(line) {
  var b1 = line.match(crackTool.date_cn_extraction_v1);
  console.log(b1);
  return b1[0] || "";
}
function exeArrayFuncV6(array_fun, which_year, next_callback) {
  async.eachSeries(array_fun, function (activity, callback) {
    // console.log(activity.data_bill_title, activity.url);
    console.log("> ======================= <");
    console.log("> activity scope", activity);
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
          if (_.isObject(activity.el)) {
            activity.el.addDoc(doc).then(function (body) {
              doc = null;
            }, function (err) {
              console.log("> xpdf error", err);
            });
          }
        });
        _V6_.start();
      });

      stream_data.on("error", function (err) {
        console.log("> http request error", err);
        console.log("> skip file order: ", activity.process_file_order);
        return callback(err, null);
      });

    });
  }, function done() {
    console.log("=================================================================================");
    console.log("=== scan completed: " + array_fun.length + " files on " + which_year + " ========");
    console.log("=================================================================================");
    if (_.isFunction(next_callback)) {
      next_callback();
    }
  });
}
Array.prototype.removeDuplicates = function () {
  var temp = new Array();
  this.sort();
  for (var i = 0; i < this.length; i++) {
    if (this[i] == this[i + 1]) {
      continue
    }
    temp[temp.length] = this[i];
  }
  return temp;
};
function exeArrayFuncV7(array_fun, which_year, next_callback) {
  async.eachSeries(array_fun,


    function (activity, callback) {
      // console.log(activity.data_bill_title, activity.url);
      //  console.log("> ======================= <");
      // console.log("> activity scope", activity);
      // console.log("> ======================= <");
      fse.ensureFile(activity.out, function (err) {

        const stream_data = request(activity.url).pipe(fs.createWriteStream(activity.out, {flags: "w"}));
        stream_data.on("finish", function () {
          if (err) {
            console.log("> xpdf file creation", "===================");
            //console.log(err);
            console.log("> xpdf end", "===================");
          }
          console.log("> xpdf file creation", "===================");
          _V8_.newInstance();
          _V8_.initNewConfig(activity);
          _V8_.on("complete", function (msg) {
            console.log("> =============================================== <");
            console.log("> callback is call here upon _V8_ is complete", msg);
            console.log("> =============================================== <");
            return callback(null, "done");
          });
          _V8_.on("scanpage", function (doc) {
            if (_.isObject(activity.el)) {
              activity.el.addDoc(doc).then(function (body) {
                doc = null;
              }, function (err) {
                console.log("> xpdf error", err);
              });
            }
          });
          _V8_.start();
          console.log("> xpdf start", "===================");
        });

        stream_data.on("error", function (err) {
          console.log("> http request error", err);
          console.log("> skip file order: ", activity.process_file_order);
          return callback(err, null);
        });

      });
    }, function done() {
      console.log("=================================================================================");
      console.log("=== scan completed: " + array_fun.length + " files on " + which_year + " ========");
      console.log("=================================================================================");
      if (_.isFunction(next_callback)) {
        next_callback();
      }
    });
};
var init_map_v7 = function (year_name, whole_list, next_step) {
  const dest = path.dirname(module.main) + "/tmp/";
  var elastic = new es2.instance({
    year: year_name
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
    var n = 0, array = [];
    var _scope_ = _.filter(whole_list, function (data) {
      return _.eq(data.year, year_name);
    });
    _scope_ = _.map(_scope_, function (data) {
      n++;
      return {
        url: data.src,
        out: dest + "gvhd" + year_name + "-" + n + ".pdf",
        el: elastic,
        process_file_order: n
      };
    });
    console.log("> === prepared to process files stored with number of [" + n + "]");
    exeArrayFuncV7(_scope_, year_name, next_step);
  });
};
var listfiles = function (path, callback) {
  var list_files = [], local_files = [], year_list = [];
  async.series([
      function (next) {
        //list out files names
        fs.readdir(path, function (err, files) {
          files.forEach(function (file) {
            // console.log(file);
            var st = path + "/" + file;
            list_files.push(st);
          });
          console.log(list_files);
          next();
        });
      },
      function (next) {
        async.eachSeries(list_files, function (item, nnext) {
            fs.readFile(item, 'utf-8', function (err, data) {
                if (_.isError(err)) {
                  throw err;
                }
                var lines = data.split(/\r?\n/);
                local_files = local_files.concat(lines);
                nnext();
              }
            );
          },
          function (end) {
            local_files = local_files.removeDuplicates();
            local_files = local_files.sort().reverse();
            local_files = _.map(local_files, function (item) {
              var it = item.match(/yr\d{2}-\d{2}/);
              return {
                year: it[0],
                src: item
              }
            });
            var li = _.map(local_files, function (it) {
              return it.year;
            });
            year_list = _.uniq(li);
            next()
          });
      },
      function (next) {
        async.eachSeries(year_list, function (yearName, n_next) {
            init_map_v7(yearName, local_files, function (n) {
              n_next();
            });
          },
          function (done) {
            next();
          })
      }],

    function (done2) {
      //  console.log("===========");
      // console.log(year_list);
      // console.log(local_files);
      //  console.log("===========");
      if (_.isFunction(callback)) {
        return callback(local_files);
      }
    });
};

module.exports.DevScanMock = onlyTestForOneYearDev;
module.exports.ListFiles = listfiles;
module.exports.ProductionScanYearSpan = contYearsScan;
module.exports.ProductionScanOneYear = onlyOneFiscalYear;

