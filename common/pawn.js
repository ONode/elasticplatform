const target_domain = "http://app.legco.gov.hk/BillsDB/odata/Vbills";
var http = require('http');
var fs = require('fs');
var fse = require('fs-extra');
const path = require('path');
const async = require('async');
var request = require("request");
var _ = require("lodash");
var es = require("./elasticsearch");
const logTag = "> crawler";
const field_index = [
    'first_reading_date_hansard_url_chi',
    'first_reading_date_hansard_url_eng',
    'first_reading_date_2_hansard_url_chi',
    'first_reading_date_2_hansard_url_eng',
    'second_reading_date_hansard_url_eng',
    'second_reading_date_hansard_url_chi',
    'second_reading_date_2_hansard_url_eng',
    'second_reading_date_2_hansard_url_chi',
    'second_reading_date_3_hansard_url_chi',
    'second_reading_date_3_hansard_url_eng',
    'second_reading_date_4_hansard_url_chi',
    'second_reading_date_4_hansard_url_eng',
    'second_reading_date_5_hansard_url_chi',
    'second_reading_date_5_hansard_url_eng',
    'third_reading_date_hansard_url_chi',
    'third_reading_date_hansard_url_eng'
];
var demo_files_lock = 1;
// create a queue object with concurrency 2
const dragonQ = async.queue(function (task, callback) {
    //   console.log('hello ' + task.name);
    const stream = request(task.url).pipe(fs.createWriteStream(task.out, {flags: 'w'}));
    stream.on('finish', function () {
        require("./pdf_process_v4")(task.out, task.isEnglish, task, callback);
    });
    stream.on('error', function (err) {
        return callback(err);
    });
}, 2);
// assign a callback
dragonQ.drain = function () {
    console.log("=====================================");
    console.log("=== scan completed for files ========");
    console.log("=====================================");
};
const step_2 = function (json, res) {
    var count = json['odata.count'];
    console.log("=== files found ===");
    console.log(count);
    console.log("=============");
    var n = 0;
    const dest = path.dirname(module.main) + "/tmp/";
    res.json({
        pathstart: dest,
        processpdfs: count,
        message: "started making queues"
    });
    es.indexExists().then(function (exist) {
        if (exists) {
            console.log("> === remove previous index");
            return deleteIndex();
        }
    }).then(function () {
        console.log("> === ini es mapping");
        return es.initIndex().then(es.initMapping());
    }).then(function () {
        _.forEach(json.value, function (val) {
            _.forEach(field_index, function (h) {
                if (!_.isEmpty(val[h])) {
                    if (n < demo_files_lock) {
                        dragonQ.push({
                            url: val[h],
                            out: dest + "hansard_" + n + ".pdf",
                            fieldname: h,
                            isEnglish: h.indexOf("_eng") !== -1,
                            postProcess: function (estask, callback) {
                                if (es.isESReady()) {
                                    /**
                                     * ELS process start in here
                                     */
                                    es.addDocFullText(estask);
                                    return callback(null, estask);
                                } else {
                                    return callback(new Error("elastic search engine is not setup properly."))
                                }
                            }
                        }, function (err, elasticObject) {
                            if (err) {
                                console.error('failure to make conversion', err);
                            } else {
                                console.log("> produced document", elasticObject.title);
                                console.log('process one file done');
                                console.log('====================================');
                            }
                        });
                    }
                    n++;
                }
            });
        });
    });
};


/*
 var exeFunc = function (file_src, n, isEnglish) {
 const dest = path.dirname(module.main) + "/tmp/";
 const out = dest + "hansard_" + n + ".pdf";
 const url = file_src;
 return function (cb) {
 console.log(logTag, "start request url at");
 const stream = request(url).pipe(fs.createWriteStream(out, {flags: 'w'}));
 stream.on('finish', function () {
 require("./pdf_process_v4")(out, isEnglish, cb);
 });
 stream.on('error', function (err) {
 return cb(err);
 });
 }
 };

 var exePatch = function (tasks, processors, next) {
 console.log(logTag, "exePatch process start");
 if (processors > 0) {
 async.parallelLimit(tasks, processors, function (err, results) {
 console.log(logTag, "exePatch process done");
 next();
 });
 } else {
 async.parallel(tasks, function (err, results) {
 console.log(logTag, "exePatch process done");
 next();
 });
 }
 };
 */
var searchByYear = function (m, res) {
    console.log("start request");
    request({
        url: target_domain + m,
        json: true
    }, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            step_2(body, res);
        } else {
            res.render('index', {title: 'Legco Center wrong request'});
        }
    });
};
module.exports.searchByYear = searchByYear;
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