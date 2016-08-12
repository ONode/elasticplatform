/**
 * Created by zJJ on 8/12/2016.
 * XDPF Util
 */
const pdfUtil = require('pdf-to-text');
module.exports = function (outdest, callback) {

    var options = {
        type: 'text',  // extract the actual text in the pdf file
        from: 0,
        to: 10
    };
    console.log("=== pdft to text ====");
    pdfUtil.pdfToText(outdesc, options, function (err, data) {
        if (err) {
            console.log("=== error form the processing ========");
            return callback(err);
        }
        
        console.log("=== scan completed ========");
        return callback(data);
    });
    
    pdfUtil.info(outdesc, function(err, info) {
        if (err) throw(err);
        console.log("=== log info========");
        console.log(info);
    });
};
