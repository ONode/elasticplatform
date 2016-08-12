/**
 * Created by zJJ on 8/12/2016.
 */
const path = require('path');
const t3 = require("./pdf_process_v3");
const t4 = require("./pdf_process_v4");
const pdf_process_v3 = function () {
    const home_tmp_folder = path.dirname(module.main) + "/tmp/";
    const file = home_tmp_folder + "hansard_0.pdf";
    console.log("> film", "processed files");
    t3(file, function () {
        console.log("> y", "processed files");
    });
};
const pdf_process_v4 = function (res) {
    const home_tmp_folder = path.dirname(module.main) + "/tmp/";
    const file = home_tmp_folder + "hansard_0.pdf";
    console.log("> fili", "processing files");
    t4(file, function (dat, pages) {
        console.log("> result xPDF::: ", dat);
        // buffer.push(data);
        res.json({
            p: pages,
            content: dat
        });
    });
};
module.exports.pdf_process_v3 = pdf_process_v3;
module.exports.pdf_process_v4 = pdf_process_v4;