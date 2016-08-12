/**
 * Created by zJJ on 8/11/2016.
 */
const pdf_extract = require('pdf-extract');
const eyec = require('eyespect');
module.exports = function (localpath, callback) {
    var inspect = eyec.inspector({maxLength: 20000});
    //var absolute_path_to_pdf = '~/Downloads/electronic.pdf'
    var options = {
        type: 'text'  // extract the actual text in the pdf file
    };
    var processor = pdf_extract(localpath, options, function (err) {
        if (err) {
            return callback(err);
        }
    });
    processor.on('complete', function (data) {
        console.log("=== scan completed ========");
        inspect(data.text_pages, 'extracted text pages');
        callback(null, data.text_pages);
    });
    processor.on('error', function (err) {
        console.log("=== error form the processing ========");
        inspect(err, 'error while extracting pages');
        return callback(err);
    });
};