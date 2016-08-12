/**
 * Created by zJJ on 8/12/2016.
 */
const path = require('path');
const pdfUtil = require('pdf-util');
const options = {
    remove_space_asian_character: true,
    new_paragraph: true,
    from: 0,
    to: 20
};
const pdf_demo_text = function (res) {
    const home_tmp_folder = path.dirname(module.main) + "/tmp/";
    const file = home_tmp_folder + "hansard_0.pdf";
    console.log("> fili", "processing files");
   /*   if (isEnglish) {
        options.remove_space_asian_character = false;
        options.new_paragraph = true;
    }*/
   
    console.log("=== pdf to text ===");
    pdfUtil.info(file, function (err, info) {
        if (err) throw(err);
        console.log("=== log info ===");
        console.log(info);
        options.to = info.pages;
        pdfUtil.pdfToText(file, options, function (err, data) {
            if (err) {
                console.log("=== error form pdfToText ===");
                return callback(err);
            }
            
            const result = {
                content: data,
                title: "X Minutes pages:" + info.pages,
                metadata: []
            };

            console.log("> result xPDF::: ", result);
            res.json(result);
        });
    });
    
};
module.exports.pdf_demo_text = pdf_demo_text;