const target_domain = "http://app.legco.gov.hk/BillsDB/odata/Vbills";
const config = "?$format=json&$inlinecount=allpages&$filter=year(bill_gazette_date) eq 2013";
var http = require('http');
var fs = require('fs');
var fse = require('fs-extra');
const path = require('path');
const async = require('async');
var request = require("request");
var _ = require("lodash");
//var pdftotext = require('pdftotextjs');
//var pdfText = require('pdf-text');
const extract = require('pdf-text-extract');


const PDFParser = require("pdf2json/PDFParser");

const logTag = "> crawler";
var goole = function (target) {
    var file = fs.createWriteStream("file.jpg");
    var request = http.get(target, function (response) {
        response.pipe(file);
    });
};
var download = function (url, dest, cb) {
    const stream = request(url).pipe(fs.createWriteStream(dest, {flags: 'w'}));
    stream.on('finish', function () {
        cb();
    });
};
var demo_files_lock = 10;

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

var mapping_files = function (json) {
    var count = json['odata.count'];
    console.log("== count ===");
    console.log(count);
    console.log("===========");
    var filequeue = [];
    var n = 0;
    _.forEach(json.value, function (val) {
        _.forEach(field_index, function (h) {

            if (!_.isEmpty(val[h])) {
                // console.log("=======");
                // console.log(val[h]);
                // console.log("=======");
                if (n < demo_files_lock) {
                    filequeue.push(exeFunc(val[h], n));
                }
                n++;
            }
        });
    });
    exePatch(filequeue, 1, function () {
        console.log("==========================================");
        console.log("=== scan completed for files of 10========");
        console.log("==========================================");
    });
};
var exeFunc = function (file_src, n) {
    const dest = path.dirname(module.main) + "/tmp/";
    const out = dest + "/hansard_" + n + ".pdf";
    const url = file_src;
    return function (cb) {
        console.log(logTag, "start request url at");
        const stream = request(url).pipe(fs.createWriteStream(out, {flags: 'w'}));
        stream.on('finish', function () {
            //  const fs = require('fs');
            /*  const pdfParser = new PDFParser();
             pdfParser.on("pdfParser_dataError", function (err) {
             console.error(err.parserError);
             });
             pdfParser.on("pdfParser_dataReady", function (pdfdata) {
             console.log("==========================================");
             console.log(logTag, "done with file path at " + out);
             fs.writeFile(out + ".txt", pdfParser.getRawTextContent());
             cb();
             });
             pdfParser.loadPDF(out);*/
            
            extract(out, {splitPages: false}, function (err, text) {
                if (err) {
                    console.log(logTag, "Error start ==================");
                    console.dir(err);
                    return;
                }
                console.log("==========================================");
                console.dir(text);
            });

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

var conference_json = function (m, res) {
    console.log("start request");
    request({
        url: target_domain + m,
        json: true
    }, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            mapping_files(body);
            res.render('index', {title: 'Successfully requested'});
        } else {
            res.render('index', {title: 'Legco Center'});
        }
    });
};
module.exports.connect_cron_job = conference_json;
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