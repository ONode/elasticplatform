const target_domain = "http://app.legco.gov.hk/BillsDB/odata/Vbills";
var http = require('http');
var fs = require('fs');
var fse = require('fs-extra');
const path = require('path');
const async = require('async');
var request = require("request");
var _ = require("lodash");
var es2 = require("./el2");
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
var V5 = require("./pdf_process_v5");
var demo_files_lock = parseInt(process.env.SEARCHFARM_SCAN_FILES_LIMIT) || 1;
// create a queue object with concurrency 2
const dragonQ = async.queue(function (task, callback) {
    fse.createFile(task.out, function (err) {
        if (err) {
            console.log("> xpdf file creation", "===================");
            console.log(err);
            console.log("> xpdf end", "===================");
        }
        const stream = request(task.url).pipe(fs.createWriteStream(task.out, {flags: 'w'}));
        stream.on('finish', function () {
            var getdoc = new V5(task.out, task.isEnglish, task, callback);
            
            getdoc.on("scanpage", function (doc) {
                console.log("> xpdf preview", "===================");
                if (doc.content.length > 0) {
                    console.log("> doc title", doc.title);
                    console.log("> xpdf data length", doc.content.length);
                } else {
                    console.log("> xpdf preview", "document skipped");
                }
                console.log("> xpdf preview", "===================");
            });
            getdoc.on("complete", function () {
                return callback(null, task);
            });
        });
        stream.on('error', function (err) {
            return callback(err);
        });
    });
}, 1);
// assign a callback
dragonQ.drain = function () {
    console.log("=====================================");
    console.log("=== scan completed for files ========");
    console.log("=====================================");
};
const step_2 = function (year_code, json, res) {
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
                elastic.initIndex().then(elastic.initMapping(), function (reject) {
                    console.log("> === failure to index");
                }).then(function () {
                    console.log("> === elasticsearch mapping");
                    callback(null, true);
                });
            }
        ], function (err, results) {
            _.forEach(json.value, function (val) {
                _.forEach(field_index, function (h) {
                    var base_file_val = val[h];
                    var regex = /_+\d+_/;
                    var isenglish = h.indexOf("_eng") !== -1, read_order = 1;
                    if (regex.test(h)) {
                        // h.match()
                        read_order = parseInt(h.replace(/[^0-9\.]/g, ''), 10);
                        //console.log(read_order);
                    } else {

                    }
                    if (!_.isEmpty(base_file_val) && n < demo_files_lock) {
                        dragonQ.push({
                                url: base_file_val,
                                out: dest + "hansard_" + n + ".pdf",
                                fieldname: h,
                                isEnglish: isenglish,
                                elengine: elastic,
                                data_read_order: read_order,
                                data_internal_key: parseInt(val.internal_key),
                                postProcess: function (estask) {

                                }
                            },
                            function (err, elasticObject) {
                                if (err) {
                                    console.error('failure to make conversion', err);
                                } else {
                                    console.log("> produced document");
                                    console.log('this file is done scanning');
                                    console.log('====================================');
                                }
                            }
                        );
                        n++;
                    }
                });
            });

        });


    }
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
var searchByYear = function (req, res) {
    const head = "?$format=json&$inlinecount=allpages&$filter=year(bill_gazette_date) eq ";
    if (!isNaN(req.params.year)) {
        var allqueries = head + req.params.year;
        console.log("start request from the year of: ", req.params.year);
        request({
            url: target_domain + allqueries,
            json: true
        }, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                step_2(req.params.year, body, res);
            } else {
                res.render('index', {title: 'Legco Center server side error'});
            }
        });
    } else {
        res.render('index', {title: 'Legco Center no year request is found'});
    }
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