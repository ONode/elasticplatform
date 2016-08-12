/**
 * Created by zJJ on 8/12/2016.
 * XDPF Util
 */
const pdfUtil = require('pdf-util');
module.exports = function (localpath, callback) {
    var options = {
        remove_space_asian_character: true,
        new_paragraph: true,
        from: 0,
        to: 10
    };
    console.log("=== pdf-t to text ====");
    //  var buffer = [];
    pdfUtil.info(localpath, function (err, info) {
        if (err) throw(err);
        console.log("=== log info========");
        console.log(info);

        pdfUtil.pdfToText(localpath, options, function (err, data) {
            if (err) {
                console.log("=== error form the processing ========");
                return callback(err);
            }
            console.log("=== scan completed ========");
            return callback(data, info.pages);
        });
    });
};
